from http.server import HTTPServer, SimpleHTTPRequestHandler
import ssl

httpd = HTTPServer(('', 4443), SimpleHTTPRequestHandler)

httpd.socket = ssl.wrap_socket(httpd.socket,
                               server_side=True,
                               keyfile=r"D:\Temp\key.pem",
                               certfile=r'D:\Temp\cert.pem',
                               ssl_version=ssl.PROTOCOL_TLS)

httpd.serve_forever()
