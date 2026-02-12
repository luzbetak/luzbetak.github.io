#!/usr/bin/env python
#------------------------------------------------------------------------------------------------------------------------#
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
from prettytable import PrettyTable

#------------------------------------------------------------------------------------------------------------------------#
# Step 1: Create Data Model 
data = {
    'question': [
        "How do I reset my password?", "What are the payment options?",
        "Where can I find my purchase history?", "How can I contact support?",
        "Can I get a refund?", "Why was I charged twice?",
        "How do I change my subscription?", "What is the return policy?",
        "How do I track my order?", "How do I update my billing information?",
        "How do I troubleshoot my device?", "Why is my payment not going through?",
        "How can I cancel my order?", "What should I do if I receive a damaged item?",
        "Where can I see my account balance?", "How do I apply a discount code?",
        "Can I exchange a product I purchased?", "How do I upgrade my plan?",
        "Why was my account suspended?", "Can I change the shipping address for my order?",
        "Where do I find the user manual?", "How do I report a missing item in my order?",
        "How do I enable two-factor authentication?", "What is the warranty on my product?",
        "How do I pay my outstanding balance?", "How can I verify my payment method?",
        "Why was my refund declined?", "Can I pay using cryptocurrency?",
        "How do I dispute a charge?", "Where do I see my payment history?",
        "What do I do if I forgot my login credentials?", "How do I reset my account PIN?",
        "What happens if my subscription expires?", "Where can I view my invoice?",
        "How do I access technical support?", "What are the supported payment methods?",
        "Can I change my delivery date?", "How do I redeem a gift card?",
        "How do I unsubscribe from email notifications?", "What do I do if my card is declined?",
        "Can I update my order before it ships?", "How can I find the nearest store?",
        "Why is my bill higher than expected?", "What should I do if I forgot my password?",
        "How do I cancel my subscription?", "How do I track my refund?",
        "Why was my payment declined?", "How do I contact technical support?",
        "How do I change my account details?"
    ],
    'category': [
        "Product Support", "Billing", "Billing", "Product Support", "Billing", "Billing", "Product Support", "Billing",
        "Product Support", "Billing", "Product Support", "Billing", "Product Support", "Product Support", "Billing",
        "Billing", "Product Support", "Product Support", "Product Support", "Product Support", "Product Support",
        "Product Support", "Product Support", "Product Support", "Billing", "Billing", "Billing", "Billing",
        "Billing", "Product Support", "Product Support", "Product Support", "Billing", "Product Support",
        "Billing", "Product Support", "Billing", "Billing", "Product Support", "Billing", "Billing",
        "Billing", "Product Support", "Product Support", "Billing", "Billing", "Billing", "Product Support",
        "Product Support"
    ]
}

#------------------------------------------------------------------------------------------------------------------------#
# Ensure the lists have the same length 
assert len(data['question']) == len(data['category']), "Length mismatch between questions and categories."
df = pd.DataFrame(data)

#------------------------------------------------------------------------------------------------------------------------#
# Step 2: Train-test split
#
# df['category']:
# This is the feature set. In this case, it's the customer questions, which represent the input data that the model will
# use to make predictions.
# 
# test_size=0.3:
# This is the target set, or the labels. It's the category (either "Product Support" or "Billing") that corresponds to
# each question. The model will be trained to predict these categories based on the input questions.
# 
# random_state=42:
# This parameter specifies the proportion of the data that should be used for testing. In this case, 30% of the data will
# be used as the test set, while the remaining 70% will be used for training.
# 
# This parameter ensures reproducibility. It sets the seed for the random number generator, so that every time you run the
# code, the same split between training and testing data occurs. The value 42 is arbitrary; you can use any number. If you
# omit this parameter, a different split will happen every time you run the code.
#------------------------------------------------------------------------------------------------------------------------#
X_train, X_test, y_train, y_test = train_test_split(df['question'], df['category'], test_size=0.3, random_state=42)

#---------------------------------------------------------------#
# Step 3: Vectorize text data
vectorizer  = TfidfVectorizer()
X_train_vec = vectorizer.fit_transform(X_train)
X_test_vec  = vectorizer.transform(X_test)

#---------------------------------------------------------------#
# Step 4: Build and train the model
clf = RandomForestClassifier(n_estimators=100, random_state=42)
clf.fit(X_train_vec, y_train)

#---------------------------------------------------------------#
# Step 5: Make predictions
y_pred = clf.predict(X_test_vec)

#---------------------------------------------------------------#
# Step 6: Evaluate the model
accuracy = accuracy_score(y_test, y_pred)
print(f"Model Accuracy: {accuracy * 100:.2f}%")

#---------------------------------------------------------------#
# Example: Predict the category of a new customer question
# new_question = ["How do I reset my account PIN?"]
#---------------------------------------------------------------#
new_question       = ["Reset my account PIN"]
new_question_vec   = vectorizer.transform(new_question)
predicted_category = clf.predict(new_question_vec)

# Display the prediction in a PrettyTable
table = PrettyTable()
table.field_names = ["Customer Question", "Predicted Category"]
table.add_row([new_question[0], predicted_category[0]])
print(table)
#------------------------------------------------------------------------------------------------------------------------#

