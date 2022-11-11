# TODO: How to import this without it crashing

import json
import sys

def sendCTKData(data):
  sys.stderr.write("\nCT_DATA\n%s\n" % json.dumps(data))
