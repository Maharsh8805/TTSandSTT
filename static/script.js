document.addEventListener('DOMContentLoaded', () => {
    // State
    let currentVoice = null;
    let currentMode = 'tts';

    // Elements
    const voiceOptions = document.querySelectorAll('.voice-option');
    const modeBtns = document.querySelectorAll('.mode-btn');
    const viewTTS = document.getElementById('view-tts');
    const viewSTT = document.getElementById('view-stt');

    // Controls
    const rateSlider = document.getElementById('rate-slider');
    const rateVal = document.getElementById('rate-val');
    const pitchSlider = document.getElementById('pitch-slider');
    const pitchVal = document.getElementById('pitch-val');

    // TTS Elements
    const ttsInput = document.getElementById('tts-input');
    const speakBtn = document.getElementById('speak-btn');
    const audioPlayer = document.getElementById('audio-player');
    const ttsPlayback = document.getElementById('tts-playback');

    // STT Elements
    const micBtn = document.getElementById('mic-btn');
    const sttStatus = document.getElementById('stt-status');
    const sttOutput = document.getElementById('stt-output');

    // --- Custom Alert Function ---
    function showAlert(message, type = 'warning') {
        // Remove existing alert if any
        const existingAlert = document.querySelector('.custom-alert');
        if (existingAlert) existingAlert.remove();

        // Create alert element
        const alert = document.createElement('div');
        alert.className = `custom-alert ${type}`;
        alert.innerHTML = `
            <i class="fa-solid fa-exclamation-triangle"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(alert);

        // Trigger animation
        setTimeout(() => alert.classList.add('show'), 10);

        // Auto remove after 3 seconds
        setTimeout(() => {
            alert.classList.remove('show');
            setTimeout(() => alert.remove(), 300);
        }, 3000);
    }

    // --- Accordion Logic ---
    const langTitles = document.querySelectorAll('.lang-title');

    langTitles.forEach(title => {
        title.addEventListener('click', () => {
            const group = title.parentElement;
            // Toggle this group
            group.classList.toggle('active');

            // Optional: Close others
            /*
            document.querySelectorAll('.lang-group').forEach(g => {
                if (g !== group) g.classList.remove('active');
            });
            */
        });
    });

    // --- Switchers ---

    voiceOptions.forEach(opt => {
        opt.addEventListener('click', (e) => {
            // If clicking the option itself
            voiceOptions.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            currentVoice = opt.dataset.voice;
            console.log("Voice:", currentVoice);
        });
    });

    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.dataset.mode;

            if (currentMode === 'tts') {
                viewTTS.style.display = 'flex';
                viewSTT.style.display = 'none';
            } else {
                viewTTS.style.display = 'none';
                viewSTT.style.display = 'flex';
            }
        });
    });

    // Sliders
    rateSlider.addEventListener('input', (e) => rateVal.innerText = e.target.value + 'x');
    pitchSlider.addEventListener('input', (e) => pitchVal.innerText = e.target.value + ' Hz');

    // --- Logic ---

    async function processText(text) {
        try {
            const formData = {
                text: text,
                voice: currentVoice,
                rate: rateSlider.value,
                pitch: pitchSlider.value
            };

            const response = await fetch('/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.status === 'success') {
                return data; // { text: "...", audio_url: "..." }
            } else {
                showAlert('Error: ' + data.message, 'error');
                return null;
            }

        } catch (e) {
            console.error(e);
            showAlert('Connection Error', 'error');
            return null;
        }
    }

    // TTS Handler
    speakBtn.addEventListener('click', async () => {
        if (!currentVoice) {
            showAlert('Please select a voice agent first.');
            return;
        }

        const text = ttsInput.value.trim();
        if (!text) return;

        speakBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
        speakBtn.disabled = true;

        const result = await processText(text);

        if (result) {
            audioPlayer.src = result.audio_url;
            ttsPlayback.style.display = 'block';
            audioPlayer.play();
        }

        speakBtn.innerHTML = '<i class="fa-solid fa-play"></i> Speak';
        speakBtn.disabled = false;
    });

    // STT Logic
    let recognition = null;
    let finalTranscript = '';

    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = () => {
            micBtn.classList.add('listening');
            sttStatus.innerText = "Listening...";
        };

        recognition.onend = () => {
            micBtn.classList.remove('listening');
            sttStatus.innerText = "Tap microphone to speak...";
        };

        recognition.onresult = (event) => {
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript + ' ';
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            // Display both final and interim results
            sttOutput.value = finalTranscript + interimTranscript;
        };

        micBtn.addEventListener('click', () => {
            if (micBtn.classList.contains('listening')) {
                recognition.stop();
            } else {
                sttOutput.value = '';
                finalTranscript = '';
                recognition.start();
            }
        });

        // Clear button
        const clearBtn = document.getElementById('clear-btn');
        clearBtn.addEventListener('click', () => {
            sttOutput.value = '';
            finalTranscript = '';
        });

        // Download button
        const downloadBtn = document.getElementById('download-btn');
        downloadBtn.addEventListener('click', () => {
            const text = sttOutput.value;
            if (!text.trim()) {
                showAlert('No transcript to download', 'warning');
                return;
            }

            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `transcript_${new Date().toISOString().slice(0, 10)}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });

    } else {
        sttStatus.innerText = "Speech Recognition Not Supported in this Browser.";
        micBtn.disabled = true;
    }

});
