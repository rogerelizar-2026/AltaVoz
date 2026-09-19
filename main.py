import os
from typing import List, Optional
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import tempfile
import wave

# Import faster-whisper
from faster_whisper import WhisperModel

# Import pyannote for diarization
from pyannote.audio import Pipeline

app = FastAPI(title="Audio Processing API")

# CORS configuration for localhost:3000 and localhost:5173
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load models at startup
WHISPER_MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "base")
whisper_model = None
diarization_pipeline = None


def load_whisper_model():
    global whisper_model
    if whisper_model is None:
        whisper_model = WhisperModel(WHISPER_MODEL_SIZE, device="cpu", compute_type="int8")
    return whisper_model


def load_diarization_pipeline():
    global diarization_pipeline
    if diarization_pipeline is None:
        # Requires HuggingFace token for pyannote
        hf_token = os.getenv("HF_TOKEN")
        if hf_token:
            diarization_pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization-3.1",
                use_auth_token=hf_token
            )
        else:
            raise HTTPException(
                status_code=500,
                detail="HF_TOKEN environment variable required for diarization"
            )
    return diarization_pipeline


class Segment(BaseModel):
    start: float
    end: float
    text: str
    confidence: float


class DiarizationSegment(BaseModel):
    start: float
    end: float
    speaker_id: str


class AlignedSegment(BaseModel):
    start: float
    end: float
    text: str
    speaker_name: str
    confidence: Optional[float] = None


class HealthResponse(BaseModel):
    status: str
    models_loaded: dict


class TranscribeRequest(BaseModel):
    segments: List[Segment]


class DiarizeRequest(BaseModel):
    segments: List[DiarizationSegment]


class AlignRequest(BaseModel):
    transcription: List[Segment]
    diarization: List[DiarizationSegment]


def save_audio_file(file: UploadFile) -> str:
    """Save uploaded audio file to temporary location"""
    suffix = "".join(os.path.splitext(file.filename or "")[-1:])
    if not suffix:
        suffix = ".wav"
    
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        content = file.file.read()
        temp_file.write(content)
        temp_file.close()
        return temp_file.name
    except Exception as e:
        temp_file.close()
        os.unlink(temp_file.name)
        raise HTTPException(status_code=400, detail=f"Error saving audio file: {str(e)}")


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Check API health and loaded models"""
    models_loaded = {
        "whisper": whisper_model is not None,
        "diarization": diarization_pipeline is not None
    }
    
    # Try to lazy-load whisper model
    try:
        load_whisper_model()
        models_loaded["whisper"] = True
    except Exception:
        pass
    
    # Check if diarization can be loaded (requires HF_TOKEN)
    try:
        load_diarization_pipeline()
        models_loaded["diarization"] = True
    except Exception:
        pass
    
    return HealthResponse(
        status="healthy",
        models_loaded=models_loaded
    )


@app.post("/transcribe", response_model=List[Segment])
async def transcribe(audio: UploadFile = File(...)):
    """Transcribe audio file using faster-whisper"""
    audio_path = None
    try:
        model = load_whisper_model()
        audio_path = save_audio_file(audio)
        
        segments, info = model.transcribe(
            audio_path,
            beam_size=5,
            word_timestamps=True
        )
        
        result = []
        for segment in segments:
            result.append(Segment(
                start=float(segment.start),
                end=float(segment.end),
                text=segment.text.strip(),
                confidence=float(segment.avg_logprob)
            ))
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription error: {str(e)}")
    finally:
        if audio_path and os.path.exists(audio_path):
            os.unlink(audio_path)


@app.post("/diarize", response_model=List[DiarizationSegment])
async def diarize(audio: UploadFile = File(...)):
    """Diarize audio file using pyannote-audio"""
    audio_path = None
    try:
        pipeline = load_diarization_pipeline()
        audio_path = save_audio_file(audio)
        
        diarization = pipeline(audio_path)
        
        result = []
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            result.append(DiarizationSegment(
                start=float(turn.start),
                end=float(turn.end),
                speaker_id=speaker
            ))
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Diarization error: {str(e)}")
    finally:
        if audio_path and os.path.exists(audio_path):
            os.unlink(audio_path)


@app.post("/align", response_model=List[AlignedSegment])
async def align(request: AlignRequest):
    """Align transcription segments with diarization to assign speaker names"""
    transcription_segments = request.transcription
    diarization_segments = request.diarization
    
    if not transcription_segments:
        return []
    
    if not diarization_segments:
        # No diarization available, return transcription without speaker info
        return [
            AlignedSegment(
                start=seg.start,
                end=seg.end,
                text=seg.text,
                speaker_name="Unknown",
                confidence=seg.confidence
            )
            for seg in transcription_segments
        ]
    
    aligned_segments = []
    
    for trans_seg in transcription_segments:
        trans_start = trans_seg.start
        trans_end = trans_seg.end
        
        # Find overlapping diarization segments
        speaker_votes = {}
        for diag_seg in diarization_segments:
            diag_start = diag_seg.start
            diag_end = diag_seg.end
            
            # Check for overlap
            overlap_start = max(trans_start, diag_start)
            overlap_end = min(trans_end, diag_end)
            
            if overlap_start < overlap_end:
                overlap_duration = overlap_end - overlap_start
                speaker = diag_seg.speaker_id
                
                if speaker not in speaker_votes:
                    speaker_votes[speaker] = 0
                speaker_votes[speaker] += overlap_duration
        
        # Assign speaker with most overlap
        if speaker_votes:
            best_speaker = max(speaker_votes.keys(), key=lambda s: speaker_votes[s])
        else:
            best_speaker = "Unknown"
        
        aligned_segments.append(AlignedSegment(
            start=trans_start,
            end=trans_end,
            text=trans_seg.text,
            speaker_name=best_speaker,
            confidence=trans_seg.confidence
        ))
    
    return aligned_segments


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
