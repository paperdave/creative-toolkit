# TODO: How to import this without it crashing

import json
import sys

def sendCTKData(data):
  sys.stderr.write("\nCTK_DATA\n%s\n" % json.dumps(data))
