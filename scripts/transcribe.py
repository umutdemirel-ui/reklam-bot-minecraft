"""Optional local STT: pip install -r scripts/requirements-voice.txt.
Models must already exist locally; this script never downloads a model implicitly.
"""
import json
import os
import sys
from faster_whisper import WhisperModel
model_path = os.environ.get('WHISPER_MODEL_PATH')
if not model_path or not os.path.isdir(model_path):
    raise RuntimeError('WHISPER_MODEL_PATH must point to an installed local model directory')
model = WhisperModel(model_path, device='cpu', compute_type='int8', local_files_only=True)
segments, _ = model.transcribe(sys.argv[1], language=sys.argv[2] if len(sys.argv) > 2 else 'tr', vad_filter=True)
print(json.dumps({'text': ' '.join(segment.text for segment in segments)}, ensure_ascii=False))
