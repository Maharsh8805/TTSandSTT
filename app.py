from flask import Flask, render_template, request, jsonify, send_file
import edge_tts
import asyncio
import os
import uuid
import re


def sanitize_text_for_tts(text):
    """
    Remove problematic symbols while preserving punctuation for natural speech pacing.
    Keeps periods, commas, question marks, and exclamation marks for proper pauses.
    """
    # Remove quotes and brackets that might be pronounced
    text = text.replace('"', '')
    text = text.replace("'", '')
    text = text.replace('(', '')
    text = text.replace(')', '')
    text = text.replace('[', '')
    text = text.replace(']', '')
    text = text.replace('{', '')
    text = text.replace('}', '')
    
    # Remove other symbols that could cause issues
    text = text.replace('*', '')
    text = text.replace('_', '')
    text = text.replace('#', '')
    text = text.replace('@', '')
    text = text.replace('&', ' and ')
    
    # Replace multiple periods (ellipsis) with single period
    text = re.sub(r'\.{2,}', '.', text)
    
    # Clean up multiple spaces while preserving punctuation
    text = re.sub(r'\s+', ' ', text)
    text = text.strip()
    
    return text


app = Flask(__name__)
AUDIO_DIR = "static/audio"
os.makedirs(AUDIO_DIR, exist_ok=True)

# Call delete_old_files periodically or on request to clean up
def cleanup_audio():
    for f in os.listdir(AUDIO_DIR):
        try:
            os.remove(os.path.join(AUDIO_DIR, f))
        except: pass

@app.route('/')
def home():
    return render_template('index.html')

async def generate_audio(text, voice, rate, pitch):
    filename = f"{uuid.uuid4()}.mp3"
    filepath = os.path.join(AUDIO_DIR, filename)
    
    # Format Rate
    rate_val = int((float(rate) - 1.0) * 100)
    rate_str = f"{rate_val:+d}%"
    
    # Format Pitch
    pitch_str = f"{int(pitch):+d}Hz"
    
    print(f"Generating -> Voice: {voice}, Rate: {rate_str}, Pitch: {pitch_str}")
    
    communicate = edge_tts.Communicate(text, voice, rate=rate_str, pitch=pitch_str)
    await communicate.save(filepath)
    return filename

@app.route('/process', methods=['POST'])
def process():
    data = request.json
    user_text = data.get('text')
    voice = data.get('voice', 'hi-IN-MadhurNeural')
    rate = data.get('rate', '1.0')
    pitch = data.get('pitch', '0')
    
    try:
        # Cleanup old audio
        cleanup_audio()
        
        # Sanitize text to prevent punctuation pronunciation
        sanitized_text = sanitize_text_for_tts(user_text)
        
        # Generate Audio
        filename = asyncio.run(generate_audio(sanitized_text, voice, rate, pitch))
        
        return jsonify({
            "status": "success",
            "text": user_text,
            "audio_url": f"/static/audio/{filename}"
        })
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

if __name__ == '__main__':
    app.run(debug=True)
