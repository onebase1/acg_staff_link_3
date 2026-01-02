
import React from 'react';

export default function Terms() {
    return (
        <div className="max-w-4xl mx-auto px-4 py-16">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>
            <div className="prose prose-lg text-gray-600">
                <p>Last updated: {new Date().toLocaleDateString()}</p>
                <h2>1. Acceptance of Terms</h2>
                <p>By accessing ACG StaffLink, you agree to these terms...</p>
                <h2>2. Usage License</h2>
                <p>Permission is granted to temporarily download one copy of the materials...</p>
            </div>
        </div>
    );
}
