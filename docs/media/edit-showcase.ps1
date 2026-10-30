param(
  [string]$Source = 'media/recordings/orbitails-master-take02-1080p60.mkv',
  [double]$ReactEndSeconds = 27,
  [double]$VueStartSeconds = 42,
  [double]$VueEndSeconds = 50
)
$ErrorActionPreference = 'Stop'
# Run from the repository root. Preserve the input recording.
$filter = "[0:v]split[r][v];[r]trim=start=0:end=${ReactEndSeconds},setpts=PTS-STARTPTS[react];[v]trim=start=${VueStartSeconds}:end=${VueEndSeconds},setpts=PTS-STARTPTS[vue];[react][vue]concat=n=2:v=1:a=0,ass=docs/media/showcase.ass[out]"
ffmpeg -hide_banner -i $Source -filter_complex $filter -map '[out]' -c:v libx264 -preset slow -crf 18 -threads 8 -pix_fmt yuv420p -r 60 -fps_mode cfr -an -movflags +faststart docs/media/orbitails-showcase-1080p60.mp4
if ($LASTEXITCODE -ne 0) { throw 'Video export failed.' }
# GIF has no audio and a reduced frame rate. Keep full 1920 x 1080 resolution.
# Ordered dithering keeps the dark UI stable while preserving 256-color output.
ffmpeg -hide_banner -i docs/media/orbitails-showcase-1080p60.mp4 -filter_complex '[0:v]setpts=0.6*PTS,fps=10,split[a][b];[a]palettegen=max_colors=256:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle' -loop 0 docs/media/orbitails-showcase-1080p.gif
if ($LASTEXITCODE -ne 0) { throw 'GIF export failed.' }
