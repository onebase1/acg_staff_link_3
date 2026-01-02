
import React from 'react';

export default function Privacy() {
    return (
        <div className="max-w-4xl mx-auto px-4 py-16">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
            <div className="prose prose-lg text-gray-600">
                <p>Last updated: {new Date().toLocaleDateString()}</p>
                <h2>1. Introduction</h2>
                <p>Agile Care Management ("we", "our", or "us") is committed to protecting your privacy...</p>
                <h2>2. Data Collection</h2>
                <p>We collect information necessary to provide staffing services...</p>
                <h2>3. Contact Us</h2>
                <p>For any privacy-related questions, please contact privacy@agilecaremanagement.co.uk</p>
            </div>
        </div>
    );
}
