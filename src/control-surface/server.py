import socket
import atexit
from typing import List
from speed_editor_api import SpeedEditorKey, SpeedEditorLed, SpeedEditorJogLed, SpeedEditorJogMode, SpeedEditorHandler, SpeedEditor
from threading import Thread

print("starting server")

connections = []
sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
sock.bind("/tmp/ct-control-surface.sock")
sock.listen()

running = True

def thread_accept():
  while running:
    conn, _ = sock.accept()
    connections.append(conn)
    conn.sendall(b"Hello\n")

def broadcast(data):
  for conn in connections:
    try:
      conn.sendall(data)
    except BrokenPipeError:
      connections.remove(conn)

thread = Thread(target=thread_accept)

def close():
  try:
    sock.close()
    for conn in connections:
      conn.close()
  except:
    pass
  try:
    global running
    running = False
    thread.join()
  except:
    pass

atexit.register(close)

thread.start()

class SendDataHandler(SpeedEditorHandler):
  def __init__(self, se):
    self.se   = se
    self.keys = []
    self.leds = 0
    self.se.set_leds(0)
    self.se.set_jog_mode(SpeedEditorJogMode.RELATIVE)

  def jog(self, mode: SpeedEditorJogMode, value):
    broadcast(b"J" + str(value).encode() + b"\n")

  def key(self, keys: List[SpeedEditorKey]):
    # Debug message
    kl = ', '.join([k.name for k in keys])
    if not kl:
      kl = 'None'
    print(f"Keys held: {kl:s}")

    # Find keys being released and toggle led if there is one
    for k in self.keys:
      if k not in keys:
        self.leds ^= getattr(SpeedEditorLed, k.name, 0)
        self.se.set_leds(self.leds)

    self.keys = keys

    # Send keypresses to all connections
    broadcast(b"K" + b",".join([k.name.encode() for k in keys]) + b"\n")

se = SpeedEditor(SendDataHandler)

try:
  while True:
    se.poll()
except KeyboardInterrupt:
  print("exiting")
  close()
  exit(0)
