import speech_recognition as sr
from groq import Groq
from dotenv import load_dotenv
import os
from pydub import AudioSegment
from pydub.playback import play
import io
load_dotenv()


client = Groq(
    api_key=os.environ.get("GROQ_API_KEY"),
)



def main():
    r  = sr.Recognizer()

    
    with sr.Microphone() as source:
        r.adjust_for_ambient_noise(source)
        r.pause_threshold =2

        SYSTEM_PROMPT = f"""
        Your name is Dev Singh . You are  a expert voice agent . you will get audio input of the user and you will respond to the user like a voice assistant only.
        you have to act like a best friend to the user and you try to understand the user and try to keep the conversation going.
        you dont have to introduce yourself ,

            """ 
        messages=[{"role":"system","content":SYSTEM_PROMPT}]
        while True:




            print("Listening... pls say something ")
            audio = r.listen(source)

            print("Recognizing...")
            stt = r.recognize_google(audio)
                
            print("You said:",stt,)


            messages.append({"role":"user","content":stt})

            chat_completion = client.chat.completions.create(
                messages=messages,
                model="llama-3.3-70b-versatile",
            )

            print(chat_completion.choices[0].message.content)

            messages.append({"role":"assistant","content":chat_completion.choices[0].message.content})



            speech_file_path = "speech.wav" 
            model = "playai-tts"
            voice = "Fritz-PlayAI"
            text = chat_completion.choices[0].message.content
            response_format = "wav"

            response = client.audio.speech.create(
                model=model,
                voice=voice,
                input=text,
                response_format=response_format
            )

            audio_bytes = b"".join(response.iter_bytes())

            # Load into an AudioSegment and play
            audio_data = io.BytesIO(audio_bytes)
            sound = AudioSegment.from_file(audio_data, format="wav")
            play(sound)



main()

