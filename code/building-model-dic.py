#!/usr/bin/env python
#--------------------------------------------------------------------------------------------------------#
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
from prettytable import PrettyTable

#--------------------------------------------------------------------------------------------------------#
# Step 1: Create Data Model
DICTIONARY = {
    'How do I reset my password?':                     'Product Support',
    'What are the payment options?':                   'Billing',
    'Where can I find my purchase history?':           'Billing',
    'How can I contact support?':                      'Product Support',
    'Can I get a refund?':                             'Billing',
    'Why was I charged twice?':                        'Billing',
    'How do I change my subscription?':                'Product Support',
    'What is the return policy?':                      'Billing',
    'How do I track my order?':                        'Product Support',
    'How do I update my billing information?':         'Billing',
    'How do I troubleshoot my device?':                'Product Support',
    'Why is my payment not going through?':            'Billing',
    'How can I cancel my order?':                      'Product Support',
    'What should I do if I receive a damaged item?':   'Product Support',
    'Where can I see my account balance?':             'Billing',
    'How do I apply a discount code?':                 'Billing',
    'Can I exchange a product I purchased?':           'Product Support',
    'How do I upgrade my plan?':                       'Product Support',
    'Why was my account suspended?':                   'Product Support',
    'Can I change the shipping address for my order?': 'Product Support',
    'Where do I find the user manual?':                'Product Support',
    'How do I report a missing item in my order?':     'Product Support',
    'How do I enable two-factor authentication?':      'Product Support',
    'What is the warranty on my product?':             'Product Support',
    'How do I pay my outstanding balance?':            'Billing',
    'How can I verify my payment method?':             'Billing',
    'Why was my refund declined?':                     'Billing',
    'Can I pay using cryptocurrency?':                 'Billing',
    'How do I dispute a charge?':                      'Billing',
    'Where do I see my payment history?':              'Billing',
    'What do I do if I forgot my login credentials?':  'Product Support',
    'How do I reset my account PIN?':                  'Product Support',
    'What happens if my subscription expires?':        'Product Support',
    'Where can I view my invoice?':                    'Billing',
    'How do I access technical support?':              'Product Support',
    'What are the supported payment methods?':         'Billing',
    'Can I change my delivery date?':                  'Product Support',
    'How do I redeem a gift card?':                    'Billing',
    'How do I unsubscribe from email notifications?':  'Billing',
    'What do I do if my card is declined?':            'Billing',
    'Can I update my order before it ships?':          'Product Support',
    'How can I find the nearest store?':               'Billing',
    'Why is my bill higher than expected?':            'Billing',
    'What should I do if I forgot my password?':       'Product Support',
    'How do I cancel my subscription?':                'Product Support',
    'How do I track my refund?':                       'Billing',
    'Why was my payment declined?':                    'Billing',
    'How do I contact technical support?':             'Product Support',
    'How do I change my account details?':             'Product Support'
}

#--------------------------------------------------------------------------------------------------------#
# Ensure the lists have the same length
df = pd.DataFrame(list(DICTIONARY.items()), columns=['question', 'category'])

#--------------------------------------------------------------------------------------------------------#
# Step 2: Train-test split
X_train, X_test, y_train, y_test = train_test_split( df['question'],
                                                     df['category'],
                                                     test_size=0.3,
                                                     random_state=42 )

#--------------------------------------------------------------------------------------------------------#
# Step 3: Vectorize text data
vectorizer  = TfidfVectorizer()
X_train_vec = vectorizer.fit_transform(X_train)
X_test_vec  = vectorizer.transform(X_test)

#--------------------------------------------------------------------------------------------------------#
# Step 4: Build and train the model
clf = RandomForestClassifier(n_estimators=100, random_state=42)
clf.fit(X_train_vec, y_train)

#--------------------------------------------------------------------------------------------------------#
# Step 5: Make predictions
y_pred = clf.predict(X_test_vec)

#--------------------------------------------------------------------------------------------------------#
# Step 6: Evaluate the model
accuracy = accuracy_score(y_test, y_pred)
print(f"Model Accuracy: {accuracy * 100:.2f}%")

#--------------------------------------------------------------------------------------------------------#
# Example: Predict the category of a new customer question
# new_question = ["How do I reset my account PIN?"]
#--------------------------------------------------------------------------------------------------------#
new_question       = ["Reset my account PIN"]
new_question_vec   = vectorizer.transform(new_question)
predicted_category = clf.predict(new_question_vec)

# Display the prediction in a PrettyTable
table = PrettyTable()
table.field_names = ["Customer Question", "Predicted Category"]
table.add_row([new_question[0], predicted_category[0]])
print(table)
#--------------------------------------------------------------------------------------------------------#
