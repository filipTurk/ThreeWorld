from flask import Flask, Response, render_template
from flask_socketio import SocketIO, emit
import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from mediapipe.framework.formats import landmark_pb2
import math 

base_options = python.BaseOptions(model_asset_path='C:/Users/turkf/Pictures/mag/IOI/project4/app/gesture_recognizer.task')
options = vision.GestureRecognizerOptions(base_options=base_options)
recognizer = vision.GestureRecognizer.create_from_options(options)

mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles
mp_hands = mp.solutions.hands

app = Flask(__name__)
socketio = SocketIO(app)

mp_face_mesh = mp.solutions.face_mesh
mp_hands = mp.solutions.hands
face_mesh = mp_face_mesh.FaceMesh()
hands = mp_hands.Hands(min_detection_confidence=0.5, min_tracking_confidence=0.5)


cap = cv2.VideoCapture(0)

def calculate_distance(point1, point2):
    return math.sqrt((point2.x - point1.x) ** 2 + (point2.y - point1.y) ** 2 + (point2.z - point1.z) ** 2)

def is_mouth_open(landmarks):

    upper_lip = landmarks[13] 
    lower_lip = landmarks[14]  


    mouth_distance = calculate_distance(upper_lip, lower_lip)

 
    threshold = 0.05  

    if mouth_distance > threshold:
        return True
    else:
        return False
    

def generate_frames():
    while True:
        ret, frame = cap.read()
        if not ret:
            break


        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        rgb_frame = cv2.resize(rgb_frame, (640, 360))  


        image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        recognition_result = recognizer.recognize(image)

        face_results = face_mesh.process(rgb_frame)
        hand_results = hands.process(rgb_frame)


        all_landmarks = {"face": [], "hands": [], "gesture": 'None', "mouth": 'Closed'}

        # Face landmarks
        if face_results.multi_face_landmarks:
            for face_landmarks in face_results.multi_face_landmarks:
                mouth_status = "Open" if is_mouth_open(face_landmarks.landmark) else "Closed"
                for landmark in face_landmarks.landmark:
                    x = int(landmark.x * frame.shape[1])
                    y = int(landmark.y * frame.shape[0])
                    all_landmarks["face"].append({"x": x, "y": y, "z": landmark.z})
                    all_landmarks["mouth"] = mouth_status
                    cv2.putText(frame, f"Mouth: {mouth_status}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                    cv2.circle(frame, (x, y), 1, (0, 255, 0), -1)

        if hand_results.multi_hand_landmarks and hand_results.multi_handedness:
            for idx, hand_landmarks in enumerate(hand_results.multi_hand_landmarks):

                handedness = hand_results.multi_handedness[idx].classification[0].label
                confidence = hand_results.multi_handedness[idx].classification[0].score

                for landmark in hand_landmarks.landmark:
                    x = int(landmark.x * frame.shape[1])
                    y = int(landmark.y * frame.shape[0])
                    all_landmarks["hands"].append({
                        "type": handedness, 
                        "x": x,
                        "y": y,
                        "z": landmark.z
                    })

                    color = (0, 0, 255) if handedness == "Left" else (255, 0, 0)
                    cv2.circle(frame, (x, y), 2, color, -1)


                cv2.putText(frame, f"{handedness} ({confidence:.2f})", (10, 60 + idx * 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

                #print(f"Hand {idx + 1}: {handedness} (Confidence: {confidence:.2f})")

        if recognition_result.gestures:
            for i, hand_landmarks in enumerate(recognition_result.hand_landmarks):
                if recognition_result.gestures[i]:
                    gesture = recognition_result.gestures[i][0]
                    all_landmarks["gesture"] = gesture.category_name
                    label = f"{gesture.category_name} ({gesture.score:.2f})"
                    cv2.putText(frame, label, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 
                                0.7, (255, 255, 255), 2, cv2.LINE_AA)


        socketio.emit('landmarks_data', all_landmarks)

        #ret, buffer = cv2.imencode('.jpg', frame)
        ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])


        if not ret:
            continue
        frame = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n\r\n')


@app.route('/video')
def video():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    socketio.run(app, debug=True)
