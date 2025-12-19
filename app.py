from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import pickle
import numpy as np
import os

app = Flask(__name__)
# Robust CORS: Allows your frontend port (like 5500) to talk to the backend (5000)
CORS(app)

# Load model
model_path = os.path.join(os.path.dirname(__file__), "loan_model.pkl")
try:
    with open(model_path, "rb") as f:
        model = pickle.load(f)
except FileNotFoundError:
    print(f"ERROR: {model_path} not found. Ensure the file is in the same folder as app.py")

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()
        
        # Explicitly extract to ensure order matches training
        # IMPORTANT: Ensure this order matches your training dataframe!
        gender = int(data["gender"])
        married = int(data["married"])
        education = int(data["education"])
        loan_amount = float(data["loan_amount"])
        credit_history = int(data["credit_history"])

        features = np.array([[gender, married, education, loan_amount, credit_history]], dtype=float)

        # Better Feature Check: Log a warning if they don't match
        expected = getattr(model, 'n_features_in_', None)
        if expected is not None and expected != features.shape[1]:
            print(f"WARNING: Model expected {expected} features, but got {features.shape[1]}")
            # Dynamic resizing (your original logic)
            if expected > features.shape[1]:
                features = np.pad(features, ((0,0), (0, expected - features.shape[1])), mode='constant')
            else:
                features = features[:, :expected]

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
        print(f"PREDICTION ERROR: {str(e)}") # This shows in your terminal
        return jsonify({"error": "Check terminal for details", "details": str(e)}), 400

if __name__ == "__main__":
    # Using localhost (127.0.0.1) for better local compatibility
    port = int(os.environ.get("PORT", 5000))
    app.run(host="127.0.0.1", port=port, debug=True)
