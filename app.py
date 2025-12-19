from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import pickle
import numpy as np
import os

app = Flask(__name__)
CORS(app)

# Load model
model_path = os.path.join(os.path.dirname(__file__), "loan_model.pkl")
model = pickle.load(open(model_path, "rb"))

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    try:
        gender = int(data["gender"])
        married = int(data["married"])
        education = int(data["education"])
        credit_history = int(data["credit_history"])
        loan_amount = float(data["loan_amount"])

        features = np.array([[gender, married, education, loan_amount, credit_history]], dtype=float)

        # Handle mismatched feature length
        expected = getattr(model, 'n_features_in_', None)
        if expected is not None and expected != features.shape[1]:
            if expected > features.shape[1]:
                pad = np.zeros((features.shape[0], expected - features.shape[1]))
                features = np.hstack([features, pad])
            else:
                features = features[:, :expected]

        prediction = model.predict(features)[0]

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
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 400

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
