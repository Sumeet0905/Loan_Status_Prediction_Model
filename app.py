from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import pickle
import numpy as np
import os

app = Flask(__name__)

CORS(app)

model = pickle.load(open("loan_model.pkl", "rb"))

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    print('\n/-- /predict received JSON:\n', data)

    try:
        gender = int(data["gender"])
        married = int(data["married"])
        education = int(data["education"])
        credit_history = int(data["credit_history"])
        loan_amount = float(data["loan_amount"])

        features = np.array([[gender, married, education, loan_amount, credit_history]], dtype=float)

        padded_note = None
        expected = getattr(model, 'n_features_in_', None)
        if expected is not None and expected != features.shape[1]:
            if expected > features.shape[1]:
                pad = np.zeros((features.shape[0], expected - features.shape[1]))
                features = np.hstack([features, pad])
                padded_note = f"Padded input with {pad.shape[1]} zeros to match model expected {expected} features."
                print(padded_note)
            else:
                features = features[:, :expected]
                padded_note = f"Trimmed input to {expected} features expected by model."
                print(padded_note)

        try:
            prediction = model.predict(features)[0]
        except Exception as e:
            raise

        probability = None
        try:
            if hasattr(model, "predict_proba"):
                probability = float(model.predict_proba(features)[0][1])
            elif hasattr(model, 'decision_function'):
                score = model.decision_function(features)[0]
                try:
                    score = float(score)
                except Exception:
                    score = float(np.asarray(score).ravel()[-1])
                probability = 1.0 / (1.0 + np.exp(-score))
        except Exception:
            probability = None

        resp = {
            "result": "Approved" if int(prediction) == 1 else "Rejected",
            "probability": probability
        }
        if padded_note:
            resp['note'] = padded_note
        return jsonify(resp)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 400


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))


