"""Local-only SPA preview of the checked production export."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent / 'all-platform-export'

class Preview(SimpleHTTPRequestHandler):
    def do_GET(self):
        requested = urlsplit(self.path).path
        if not Path(self.translate_path(requested)).exists() and not Path(requested).suffix:
            self.path = '/index.html'
        super().do_GET()

if __name__ == '__main__':
    if not (ROOT / 'index.html').is_file():
        raise SystemExit('Create the production export before opening this preview.')
    print('Production preview: http://127.0.0.1:8087', flush=True)
    ThreadingHTTPServer(('127.0.0.1', 8087), partial(Preview, directory=str(ROOT))).serve_forever()
