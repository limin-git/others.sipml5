from http.server import HTTPServer, ThreadingHTTPServer, SimpleHTTPRequestHandler
import ssl

# httpd = HTTPServer(('', 4443), SimpleHTTPRequestHandler)
httpd = ThreadingHTTPServer(('', 4443), SimpleHTTPRequestHandler)

httpd.socket = ssl.wrap_socket(httpd.socket,
                               server_side=True,
                               keyfile=r"C:\Users\zhuli\key.pem",
                               certfile=r'C:\Users\zhuli\cert.pem',
                               ssl_version=ssl.PROTOCOL_TLS)

httpd.serve_forever()
