import torch
import torch.nn as nn
from transformers import Wav2Vec2Model


MODEL_NAME = "ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition"
MODEL_PATH = "models/best_voice_model.pth"

TARGET_CLASSES = [
    "anger",
    "disgust",
    "fear",
    "happiness",
    "sadness",
    "surprise",
    "neutral",
]


class TemporalAttentionPooling(nn.Module):
    def __init__(self, hidden_dim):
        super().__init__()

        self.query = nn.Sequential(
            nn.Linear(hidden_dim, 256),
            nn.Tanh(),
            nn.Linear(256, 1)
        )

    def forward(self, hidden_states, mask=None):
        scores = self.query(hidden_states)

        if mask is not None:
            if mask.size(1) != hidden_states.size(1):
                stride = max(
                    1,
                    mask.size(1) // hidden_states.size(1)
                )

                sub_mask = mask[:, ::stride][
                    :, :hidden_states.size(1)
                ]
            else:
                sub_mask = mask

            scores = scores.masked_fill(
                sub_mask.unsqueeze(-1) == 0,
                -1e4
            )

        weights = torch.softmax(scores, dim=1)

        context = torch.sum(
            hidden_states * weights,
            dim=1
        )

        return context


class SOTAProductionVoiceEmotionModel(nn.Module):

    def __init__(
        self,
        pretrained_name=MODEL_NAME,
        num_classes=7
    ):
        super().__init__()

        print(
            f"Loading backbone: {pretrained_name}"
        )

        self.wav2vec2 = Wav2Vec2Model.from_pretrained(
            pretrained_name
        )

        hidden_dim = self.wav2vec2.config.hidden_size

        print(
            f"Backbone hidden dimension: {hidden_dim}"
        )

        self.wav2vec2.feature_extractor._freeze_parameters()

        self.attention_pool = TemporalAttentionPooling(
            hidden_dim
        )

        self.classifier = nn.Sequential(
            nn.LayerNorm(hidden_dim),
            nn.Dropout(p=0.3),
            nn.Linear(hidden_dim, 512),
            nn.GELU(),
            nn.Dropout(p=0.2),
            nn.Linear(512, num_classes)
        )

    def forward(
        self,
        input_values,
        attention_mask=None
    ):
        outputs = self.wav2vec2(
            input_values,
            attention_mask=attention_mask
        )

        hidden_states = outputs.last_hidden_state

        pooled = self.attention_pool(
            hidden_states,
            mask=attention_mask
        )

        logits = self.classifier(pooled)

        return logits


print("\n==============================================")
print("   NEW VOICE MODEL VERIFICATION")
print("==============================================\n")

device = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

print(f"Device: {device}")
print(f"Checkpoint: {MODEL_PATH}\n")


# -------------------------------------------------
# 1. Check checkpoint
# -------------------------------------------------

import os

if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(
        f"Checkpoint not found: {MODEL_PATH}"
    )

size_mb = os.path.getsize(MODEL_PATH) / (1024 * 1024)

print(
    f"Checkpoint found: {size_mb:.2f} MB"
)


# -------------------------------------------------
# 2. Create architecture
# -------------------------------------------------

model = SOTAProductionVoiceEmotionModel(
    MODEL_NAME,
    len(TARGET_CLASSES)
)

model.to(device)


# -------------------------------------------------
# 3. Load trained weights
# -------------------------------------------------

print("\nLoading trained checkpoint...")

state_dict = torch.load(
    MODEL_PATH,
    map_location=device,
    weights_only=True
)

print(
    f"Checkpoint tensors: {len(state_dict)}"
)

model.load_state_dict(state_dict)

model.eval()

print("✅ Voice model weights loaded successfully")


# -------------------------------------------------
# 4. Warmup inference
# -------------------------------------------------

print("\nRunning warmup inference...")

sample_rate = 16000
duration = 3

dummy_audio = torch.zeros(
    1,
    sample_rate * duration,
    dtype=torch.float32
).to(device)

dummy_mask = torch.ones(
    1,
    sample_rate * duration,
    dtype=torch.float32
).to(device)


with torch.no_grad():

    output = model(
        dummy_audio,
        attention_mask=dummy_mask
    )


print(
    f"Output shape: {output.shape}"
)


# -------------------------------------------------
# 5. Validate output
# -------------------------------------------------

expected_shape = (1, len(TARGET_CLASSES))

if tuple(output.shape) != expected_shape:

    raise RuntimeError(
        f"Unexpected output shape: "
        f"{output.shape}, expected {expected_shape}"
    )


print("\n==============================================")
print("       ✅ VOICE MODEL VERIFICATION PASSED")
print("==============================================")

print("\nClasses:")

for i, emotion in enumerate(TARGET_CLASSES):
    print(f"  {i}: {emotion}")

print("\nThe new checkpoint matches the architecture.")
print("It can now be integrated into voice_inference.py.")