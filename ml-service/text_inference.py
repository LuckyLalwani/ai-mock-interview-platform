import os
import json
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification


MODEL_DIR = os.path.join(
    os.path.dirname(__file__),
    "models",
    "text"
)


class TextEmotionPredictor:

    def __init__(self, model_dir=MODEL_DIR):

        self.device = "cuda" if torch.cuda.is_available() else "cpu"

        print(f"Loading text emotion model on: {self.device}")

        self.tokenizer = AutoTokenizer.from_pretrained(model_dir)

        self.model = AutoModelForSequenceClassification.from_pretrained(
            model_dir
        ).to(self.device)

        self.model.eval()

        # Load emotion metadata
        meta_path = os.path.join(
            model_dir,
            "emotion_model_metadata.json"
        )

        if os.path.exists(meta_path):

            with open(meta_path, "r") as f:
                meta = json.load(f)

            self.id2label = {
                int(k): v
                for k, v in meta["id2label"].items()
            }

            self.classes = meta["target_emotions"]

        else:

            self.id2label = {
                0: "anger",
                1: "disgust",
                2: "fear",
                3: "happiness",
                4: "sadness",
                5: "surprise",
                6: "neutral"
            }

            self.classes = list(self.id2label.values())

        print("Text emotion model loaded successfully!")


    def predict(self, text: str):

        inputs = self.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=128
        )

        inputs = {
            key: value.to(self.device)
            for key, value in inputs.items()
        }

        with torch.no_grad():

            outputs = self.model(**inputs)

            probabilities = torch.softmax(
                outputs.logits,
                dim=-1
            ).squeeze(0).cpu().numpy()

        top_idx = int(probabilities.argmax())

        top_emotion = self.id2label[top_idx]

        confidence = float(probabilities[top_idx])

        results = {
            "success": True,
            "text": text,
            "emotion": top_emotion,
            "confidence": confidence,
            "predictions": {
                self.id2label[i]: float(probabilities[i])
                for i in range(len(self.classes))
            }
        }

        return results


# Create one model instance
text_predictor = TextEmotionPredictor()