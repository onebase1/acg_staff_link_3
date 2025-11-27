import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

const INPUT_FILE = 'dominion_doc/DHCS - CLIENTS RECORDS.csv';
const OUTPUT_FILE = 'dominion_doc/dom_clients_cleaned.csv';
const AGENCY_ID = 'c8e84c94-8233-4084-b4c3-63ad9dc81c16'; // Dominion Healthcare Services Ltd

try {
    const input = fs.readFileSync(INPUT_FILE, 'utf8');
    const records = parse(input, {
        columns: true,
        skip_empty_lines: true,
        trim: true
    });

    console.log(`Found ${records.length} records`);

    const cleanedRecords = records.map(record => {
        // Construct address JSON
        const address = {
            line1: record.address_line1 || '',
            line2: record.address_line2 || '',
            city: record.city || '',
            postcode: record.postcode || '',
            country: 'UK'
        };

        // Construct contact person JSON
        const contactPerson = {
            name: record.contact_person_name || '',
            role: record.contact_person_role || '',
            email: record.contact_person_email || '',
            phone: record.contact_person_phone || ''
        };

        return {
            name: record.Company || record.name || '',
            type: (record.type || 'care_home').toLowerCase().replace(' ', '_'),
            status: 'active',
            agency_id: AGENCY_ID,
            email: record.email || record.contact_person_email || '',
            phone: record.phone || '',
            address: JSON.stringify(address), // Store as JSON string for CSV
            contact_person: JSON.stringify(contactPerson), // Store as JSON string for CSV
            notes: record.notes || '',
            payment_terms: record.payment_terms || '{"days": 30}',
            cqc_rating: record.cqc_rating || '',
            bed_capacity: record.bed_capacity || 0,
            website: record.website || ''
        };
    });

    const output = stringify(cleanedRecords, {
        header: true
    });

    fs.writeFileSync(OUTPUT_FILE, output);
    console.log(`Successfully wrote ${cleanedRecords.length} cleaned records to ${OUTPUT_FILE}`);

} catch (error) {
    console.error('Error processing CSV:', error);
}
