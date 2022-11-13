local compPath = os.getenv("ct_filename")
local ranges = os.getenv("ct_ranges")

print("ct_filename: " .. compPath)
print("ct_ranges: " .. ranges)

local fusion = Fusion("localhost", 0 os.getenv("ct_fusion_uuid"))
if not fusion then
  print("Fusion not found")
  return
end
local comp = fusion:LoadComp(compPath, true)

comp:Render({
  Wait = false,
  FrameRange = ranges,
  HiQ = true,
  MotionBlur = true,
  Tool = comp.MainOutput
})

local currentFrame = nil
while comp:GetAttrs().COMPB_Rendering do
  wait(0.2)
  local attrs = comp:GetAttrs()
  local frame = attrs.COMPN_LastFrameRendered
  if frame ~= currentFrame then
    currentFrame = frame
    io.stdout:write(
      "CT_DATA\n" ..
      '{"frame":' .. frame ..
      ',"lastFrameTime":' .. attrs.COMPN_LastFrameTime ..
      ',"averageFrameTime":' .. attrs.COMPN_AverageFrameTime ..
      ',"timeRemaining":' .. attrs.COMPN_TimeRemaining ..
      ',"elapsedTime":' .. attrs.COMPN_ElapsedTime ..
      '}\n'
    )
    io.stdout:flush()
  end
end

comp:Close()

io.stdout:write('CT_DATA\n{"done":"true"}\n')
io.stdout:flush()
