using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading.Tasks;

namespace AetherPlayer
{
    internal sealed class MediaServer : IDisposable
    {
        private static readonly Dictionary<string, string> MimeTypes = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            { ".mp4", "video/mp4" },
            { ".m4v", "video/mp4" },
            { ".mov", "video/quicktime" },
            { ".webm", "video/webm" },
            // Serve Matroska (.mkv) as video/webm so Chromium/WebView2 hardware pipeline decodes EBML streams natively
            { ".mkv", "video/webm" },
            { ".ogv", "video/ogg" },
            { ".mp3", "audio/mpeg" },
            { ".wav", "audio/wav" },
            { ".ogg", "audio/ogg" },
            { ".flac", "audio/flac" },
            { ".m4a", "audio/mp4" },
            { ".aac", "audio/aac" },
            { ".vtt", "text/vtt; charset=utf-8" },
            { ".srt", "text/plain; charset=utf-8" }
        };

        private readonly TcpListener _listener;
        private readonly ConcurrentDictionary<string, string> _tokenToPath = new ConcurrentDictionary<string, string>(StringComparer.Ordinal);
        private readonly ConcurrentDictionary<string, string> _pathToToken = new ConcurrentDictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        private volatile bool _running;
        private bool _disposed;

        public int Port { get; private set; }
        public string BaseUrl { get; private set; }

        public MediaServer()
        {
            _listener = new TcpListener(IPAddress.Loopback, 0);
            _listener.Start();
            IPEndPoint endpoint = (IPEndPoint)_listener.LocalEndpoint;
            Port = endpoint.Port;
            BaseUrl = string.Format(CultureInfo.InvariantCulture, "http://127.0.0.1:{0}", Port);
            _running = true;
            Task.Run(new Func<Task>(AcceptLoopAsync));
        }

        public string RegisterFile(string filePath)
        {
            if (string.IsNullOrWhiteSpace(filePath))
            {
                return null;
            }
            string fullPath = Path.GetFullPath(filePath);
            string existingToken;
            if (_pathToToken.TryGetValue(fullPath, out existingToken))
            {
                return string.Format(CultureInfo.InvariantCulture, "{0}/media/{1}", BaseUrl, existingToken);
            }
            string token = Guid.NewGuid().ToString("N");
            _tokenToPath[token] = fullPath;
            _pathToToken[fullPath] = token;
            return string.Format(CultureInfo.InvariantCulture, "{0}/media/{1}", BaseUrl, token);
        }

        public static string DetectMimeType(string filePath)
        {
            string lowerName = Path.GetFileName(filePath).ToLowerInvariant();
            if (lowerName.EndsWith(".webm.part", StringComparison.Ordinal)) return "video/webm";
            if (lowerName.EndsWith(".mkv.part", StringComparison.Ordinal)) return "video/webm";
            if (lowerName.EndsWith(".mp4.part", StringComparison.Ordinal)) return "video/mp4";
            if (lowerName.EndsWith(".m4v.part", StringComparison.Ordinal)) return "video/mp4";
            if (lowerName.EndsWith(".mp3.part", StringComparison.Ordinal)) return "audio/mpeg";

            string ext = Path.GetExtension(filePath);
            string mapped;
            if (!string.IsNullOrEmpty(ext) && MimeTypes.TryGetValue(ext, out mapped))
            {
                return mapped;
            }

            if (string.Equals(ext, ".part", StringComparison.OrdinalIgnoreCase))
            {
                return SniffPartialContainerMime(filePath);
            }

            return "application/octet-stream";
        }

        private static string SniffPartialContainerMime(string filePath)
        {
            try
            {
                byte[] head = new byte[16];
                int read = 0;
                using (FileStream fs = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete))
                {
                    read = fs.Read(head, 0, head.Length);
                }

                if (read >= 4 && head[0] == 0x1A && head[1] == 0x45 && head[2] == 0xDF && head[3] == 0xA3)
                {
                    return "video/webm"; // WebM / Matroska EBML header
                }
                if (read >= 8 && head[4] == (byte)'f' && head[5] == (byte)'t' && head[6] == (byte)'y' && head[7] == (byte)'p')
                {
                    return "video/mp4"; // ISO BMFF / MP4 ftyp box
                }
                if (read >= 3 && head[0] == (byte)'I' && head[1] == (byte)'D' && head[2] == (byte)'3')
                {
                    return "audio/mpeg";
                }
                if (read >= 2 && head[0] == 0xFF && (head[1] & 0xE0) == 0xE0)
                {
                    return "audio/mpeg";
                }
            }
            catch
            {
            }
            return "video/mp4";
        }

        private async Task AcceptLoopAsync()
        {
            while (_running)
            {
                TcpClient client = null;
                try
                {
                    client = await _listener.AcceptTcpClientAsync().ConfigureAwait(false);
                    Task ignored = HandleClientAsync(client);
                }
                catch (ObjectDisposedException)
                {
                    break;
                }
                catch (SocketException)
                {
                    if (!_running) break;
                }
                catch
                {
                    if (client != null)
                    {
                        try { client.Close(); } catch { }
                    }
                }
            }
        }

        private async Task HandleClientAsync(TcpClient client)
        {
            using (client)
            {
                client.NoDelay = true;
                using (NetworkStream stream = client.GetStream())
                {
                    string requestText = await ReadHttpHeaderAsync(stream).ConfigureAwait(false);
                    if (string.IsNullOrEmpty(requestText))
                    {
                        return;
                    }

                    string[] lines = requestText.Split(new[] { "\r\n" }, StringSplitOptions.None);
                    if (lines.Length == 0)
                    {
                        return;
                    }

                    string[] requestLine = lines[0].Split(' ');
                    if (requestLine.Length < 2)
                    {
                        await SendSimpleResponseAsync(stream, "400 Bad Request", "Bad Request").ConfigureAwait(false);
                        return;
                    }

                    string method = requestLine[0].ToUpperInvariant();
                    string rawPath = requestLine[1].Split('?')[0];

                    Dictionary<string, string> headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                    for (int i = 1; i < lines.Length; i++)
                    {
                        int colon = lines[i].IndexOf(':');
                        if (colon > 0)
                        {
                            string key = lines[i].Substring(0, colon).Trim();
                            string val = lines[i].Substring(colon + 1).Trim();
                            headers[key] = val;
                        }
                    }

                    if (method == "OPTIONS")
                    {
                        await SendOptionsAsync(stream).ConfigureAwait(false);
                        return;
                    }

                    if (method != "GET" && method != "HEAD")
                    {
                        await SendSimpleResponseAsync(stream, "405 Method Not Allowed", "Method Not Allowed").ConfigureAwait(false);
                        return;
                    }

                    if (!rawPath.StartsWith("/media/", StringComparison.Ordinal))
                    {
                        await SendSimpleResponseAsync(stream, "404 Not Found", "Not Found").ConfigureAwait(false);
                        return;
                    }

                    string token = rawPath.Substring("/media/".Length).Trim('/');
                    string filePath;
                    if (!_tokenToPath.TryGetValue(token, out filePath) || !File.Exists(filePath))
                    {
                        await SendSimpleResponseAsync(stream, "404 Not Found", "Media Not Found").ConfigureAwait(false);
                        return;
                    }

                    string contentType = DetectMimeType(filePath);
                    FileInfo info = new FileInfo(filePath);
                    long totalLength = info.Length;
                    bool isHead = (method == "HEAD");

                    string rangeHeader;
                    if (headers.TryGetValue("Range", out rangeHeader) && !string.IsNullOrEmpty(rangeHeader))
                    {
                        long start;
                        long end;
                        if (!TryParseRange(rangeHeader, totalLength, out start, out end))
                        {
                            await SendRangeNotSatisfiableAsync(stream, totalLength).ConfigureAwait(false);
                            return;
                        }

                        long contentLength = end - start + 1;
                        StringBuilder sb = new StringBuilder();
                        sb.Append("HTTP/1.1 206 Partial Content\r\n");
                        sb.AppendFormat(CultureInfo.InvariantCulture, "Content-Type: {0}\r\n", contentType);
                        sb.Append("Accept-Ranges: bytes\r\n");
                        sb.AppendFormat(CultureInfo.InvariantCulture, "Content-Range: bytes {0}-{1}/{2}\r\n", start, end, totalLength);
                        sb.AppendFormat(CultureInfo.InvariantCulture, "Content-Length: {0}\r\n", contentLength);
                        sb.Append("Access-Control-Allow-Origin: *\r\n");
                        sb.Append("Access-Control-Expose-Headers: Content-Length, Content-Range, Accept-Ranges\r\n");
                        sb.Append("Cache-Control: no-store\r\n");
                        sb.Append("Connection: close\r\n\r\n");

                        byte[] headBytes = Encoding.ASCII.GetBytes(sb.ToString());
                        await stream.WriteAsync(headBytes, 0, headBytes.Length).ConfigureAwait(false);

                        if (!isHead && contentLength > 0)
                        {
                            await StreamFileSliceAsync(stream, filePath, start, contentLength).ConfigureAwait(false);
                        }
                        return;
                    }

                    StringBuilder okHeader = new StringBuilder();
                    okHeader.Append("HTTP/1.1 200 OK\r\n");
                    okHeader.AppendFormat(CultureInfo.InvariantCulture, "Content-Type: {0}\r\n", contentType);
                    okHeader.Append("Accept-Ranges: bytes\r\n");
                    okHeader.AppendFormat(CultureInfo.InvariantCulture, "Content-Length: {0}\r\n", totalLength);
                    okHeader.Append("Access-Control-Allow-Origin: *\r\n");
                    okHeader.Append("Access-Control-Expose-Headers: Content-Length, Content-Range, Accept-Ranges\r\n");
                    okHeader.Append("Cache-Control: no-store\r\n");
                    okHeader.Append("Connection: close\r\n\r\n");

                    byte[] okBytes = Encoding.ASCII.GetBytes(okHeader.ToString());
                    await stream.WriteAsync(okBytes, 0, okBytes.Length).ConfigureAwait(false);

                    if (!isHead && totalLength > 0)
                    {
                        await StreamFileSliceAsync(stream, filePath, 0, totalLength).ConfigureAwait(false);
                    }
                }
            }
        }

        private static async Task<string> ReadHttpHeaderAsync(NetworkStream stream)
        {
            byte[] buffer = new byte[8192];
            int totalRead = 0;
            while (totalRead < buffer.Length)
            {
                int bytesRead = await stream.ReadAsync(buffer, totalRead, buffer.Length - totalRead).ConfigureAwait(false);
                if (bytesRead <= 0)
                {
                    break;
                }
                totalRead += bytesRead;
                string current = Encoding.ASCII.GetString(buffer, 0, totalRead);
                int idx = current.IndexOf("\r\n\r\n", StringComparison.Ordinal);
                if (idx >= 0)
                {
                    return current.Substring(0, idx);
                }
            }
            return totalRead > 0 ? Encoding.ASCII.GetString(buffer, 0, totalRead) : null;
        }

        private static bool TryParseRange(string header, long totalLength, out long start, out long end)
        {
            start = 0;
            end = totalLength - 1;
            if (totalLength <= 0)
            {
                return false;
            }
            string trimmed = header.Trim();
            if (!trimmed.StartsWith("bytes=", StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }
            string spec = trimmed.Substring(6).Split(',')[0].Trim();
            int dash = spec.IndexOf('-');
            if (dash < 0)
            {
                return false;
            }

            string left = spec.Substring(0, dash).Trim();
            string right = spec.Substring(dash + 1).Trim();

            if (string.IsNullOrEmpty(left) && string.IsNullOrEmpty(right))
            {
                return false;
            }

            if (string.IsNullOrEmpty(left))
            {
                long suffix;
                if (!long.TryParse(right, NumberStyles.Integer, CultureInfo.InvariantCulture, out suffix) || suffix <= 0)
                {
                    return false;
                }
                start = Math.Max(0, totalLength - suffix);
                end = totalLength - 1;
                return true;
            }

            if (!long.TryParse(left, NumberStyles.Integer, CultureInfo.InvariantCulture, out start) || start < 0 || start >= totalLength)
            {
                return false;
            }

            if (string.IsNullOrEmpty(right))
            {
                end = totalLength - 1;
                return true;
            }

            if (!long.TryParse(right, NumberStyles.Integer, CultureInfo.InvariantCulture, out end) || end < start)
            {
                return false;
            }

            if (end >= totalLength)
            {
                end = totalLength - 1;
            }
            return true;
        }

        private static async Task StreamFileSliceAsync(NetworkStream netStream, string filePath, long offset, long length)
        {
            byte[] buffer = new byte[65536];
            long remaining = length;

            using (FileStream fs = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete, 65536, true))
            {
                fs.Seek(offset, SeekOrigin.Begin);
                while (remaining > 0)
                {
                    int toRead = (int)Math.Min(buffer.Length, remaining);
                    int read = await fs.ReadAsync(buffer, 0, toRead).ConfigureAwait(false);
                    if (read <= 0)
                    {
                        break;
                    }
                    try
                    {
                        await netStream.WriteAsync(buffer, 0, read).ConfigureAwait(false);
                    }
                    catch
                    {
                        break;
                    }
                    remaining -= read;
                }
            }
        }

        private static async Task SendOptionsAsync(NetworkStream stream)
        {
            string resp =
                "HTTP/1.1 204 No Content\r\n" +
                "Access-Control-Allow-Origin: *\r\n" +
                "Access-Control-Allow-Methods: GET, HEAD, OPTIONS\r\n" +
                "Access-Control-Allow-Headers: Range\r\n" +
                "Access-Control-Max-Age: 86400\r\n" +
                "Connection: close\r\n\r\n";
            byte[] data = Encoding.ASCII.GetBytes(resp);
            await stream.WriteAsync(data, 0, data.Length).ConfigureAwait(false);
        }

        private static async Task SendRangeNotSatisfiableAsync(NetworkStream stream, long totalLength)
        {
            string resp = string.Format(
                CultureInfo.InvariantCulture,
                "HTTP/1.1 416 Range Not Satisfiable\r\n" +
                "Content-Range: bytes */{0}\r\n" +
                "Access-Control-Allow-Origin: *\r\n" +
                "Content-Length: 0\r\n" +
                "Connection: close\r\n\r\n",
                totalLength);
            byte[] data = Encoding.ASCII.GetBytes(resp);
            await stream.WriteAsync(data, 0, data.Length).ConfigureAwait(false);
        }

        private static async Task SendSimpleResponseAsync(NetworkStream stream, string status, string body)
        {
            byte[] bodyBytes = Encoding.UTF8.GetBytes(body);
            string header = string.Format(
                CultureInfo.InvariantCulture,
                "HTTP/1.1 {0}\r\n" +
                "Content-Type: text/plain; charset=utf-8\r\n" +
                "Content-Length: {1}\r\n" +
                "Access-Control-Allow-Origin: *\r\n" +
                "Connection: close\r\n\r\n",
                status,
                bodyBytes.Length);
            byte[] headerBytes = Encoding.ASCII.GetBytes(header);
            await stream.WriteAsync(headerBytes, 0, headerBytes.Length).ConfigureAwait(false);
            await stream.WriteAsync(bodyBytes, 0, bodyBytes.Length).ConfigureAwait(false);
        }

        public void Dispose()
        {
            if (_disposed) return;
            _disposed = true;
            _running = false;
            try { _listener.Stop(); } catch { }
        }
    }
}
