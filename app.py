from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import pickle
import numpy as np
import os
import traceback

app = Flask(__name__)
# CORS is enabled so you can still test locally while the app is hosted
CORS(app)

# Load model safely
model_path = os.path.join(os.path.dirname(__file__), "loan_model.pkl")
model = None

try:
    if os.path.exists(model_path):
        with open(model_path, "rb") as f:
            model = pickle.load(f)
        print("✅ Model loaded successfully.")
    else:
        print(f"❌ Error: {model_path} not found!")
except Exception as e:
    print(f"❌ Model Loading Error: {e}")

@app.route("/")
def home():
    # This serves your index.html file from the 'templates' folder
    return render_template("index.html")

@app.route("/predict", methods=["POST"])
def predict():
    if model is None:
        return jsonify({"error": "Model not available on server"}), 500
        
    try:
        data = request.get_json()
        
        # Ensure data is converted to float for the model
        # Order: Gender, Married, Education, LoanAmount, Credit_History
        features = np.array([[
            float(data.get("gender", 0)),
            float(data.get("married", 0)),
            float(data.get("education", 0)),
            float(data.get("loan_amount", 0)),
            float(data.get("credit_history", 0))
        ]])

        # Automatic feature scaling/padding if model expects more columns
        expected_features = getattr(model, 'n_features_in_', 5)
        if features.shape[1] < expected_features:
            padding = np.zeros((1, expected_features - features.shape[1]))
            features = np.hstack([features, padding])
        elif features.shape[1] > expected_features:
            features = features[:, :expected_features]

        prediction = model.predict(features)[0]
        
        # Calculate Probability
        probability = None
        if hasattr(model, "predict_proba"):
            probability = float(model.predict_proba(features)[0][1])
        elif hasattr(model, 'decision_function'):
            score = model.decision_function(features)[0]
            probability = 1.0 / (1.0 + np.exp(-score))

        return jsonify({
            "result": "Approved" if int(prediction) == 1 else "Rejected",
            "probability": probability
        })

    except Exception as e:
        print("Prediction Logic Error:")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 400

if __name__ == "__main__":
    # Render uses the PORT environment variable
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
