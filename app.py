from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import pickle
import numpy as np
import os
import traceback

app = Flask(__name__)
CORS(app)

# Load your trained model
try:
    model = pickle.load(open("loan_model.pkl", "rb"))
except Exception as e:
    print("Error loading model:", e)
    model = None

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/predict", methods=["POST"])
def predict():
    if model is None:
        return jsonify({"error": "Model not loaded"}), 500

    data = request.get_json()
    print('\n/predict received JSON:', data)

    required_fields = ["gender", "married", "education", "credit_history", "loan_amount"]
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400

    try:
        gender = int(data["gender"])
        married = int(data["married"])
        education = int(data["education"])
        credit_history = int(data["credit_history"])
        loan_amount = float(data["loan_amount"])

        features = np.array([[gender, married, education, loan_amount, credit_history]], dtype=float)

        # Adjust features if model expects a different number
        padded_note = None
        expected = getattr(model, 'n_features_in_', features.shape[1])
        if expected != features.shape[1]:
            if expected > features.shape[1]:
                pad = np.zeros((features.shape[0], expected - features.shape[1]))
                features = np.hstack([features, pad])
                padded_note = f"Padded input with {pad.shape[1]} zeros to match model expected {expected} features."
                print(padded_note)
            else:
                features = features[:, :expected]
                padded_note = f"Trimmed input to {expected} features expected by model."
                print(padded_note)

        # Predict
        prediction = model.predict(features)[0]

        # Probability
        probability = None
        try:
            if hasattr(model, "predict_proba"):
                probability = float(model.predict_proba(features)[0][1])
            elif hasattr(model, "decision_function"):
                score = float(model.decision_function(features)[0])
                probability = 1.0 / (1.0 + np.exp(-score))
        except Exception:
            probability = None

        response = {
            "result": "Approved" if int(prediction) == 1 else "Rejected",
            "probability": probability
        }
        if padded_note:
            response['note'] = padded_note

        return jsonify(response)

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 400

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)
