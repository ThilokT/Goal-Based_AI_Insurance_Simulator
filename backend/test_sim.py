import numpy as np
from sentence_transformers import SentenceTransformer

# Load the same small model we use for the semantic cache
model = SentenceTransformer('all-MiniLM-L6-v2')

q1 = "tell me about endowment policies"
q2 = "What is an endowment plan"

emb1 = model.encode(q1)
emb2 = model.encode(q2)

similarity = np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2))
print(f"Similarity: {similarity}")
