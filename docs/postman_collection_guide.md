# Postman Collection Guide
## Student Record Management System — IT323 Midterm PIT

**Base URL:** `http://localhost:3000`
**Import file:** See `postman_collection.json` in this same folder.

---

## Test 1 – GET All Students

| Field | Value |
|---|---|
| **Method** | GET |
| **URL** | `http://localhost:3000/api/students` |
| **Headers** | None required |
| **Body** | None |

**Test Script (Tests tab):**
```javascript
pm.test("Status code is 200", () => pm.response.to.have.status(200));
pm.test("Response has data array", () => {
  const json = pm.response.json();
  pm.expect(json.success).to.be.true;
  pm.expect(json.data).to.be.an('array');
});
pm.test("Ordered by last_name ASC", () => {
  const names = pm.response.json().data.map(s => s.last_name);
  const sorted = [...names].sort();
  pm.expect(names).to.eql(sorted);
});
```

**Expected Response:**
```json
{ "success": true, "data": [ { "id": 7, "last_name": "Aquino", ... }, ... ] }
```

---

## Test 2 – GET Student by ID

| Field | Value |
|---|---|
| **Method** | GET |
| **URL** | `http://localhost:3000/api/students/1` |
| **Headers** | None required |
| **Body** | None |

**Test Script:**
```javascript
pm.test("Status code is 200", () => pm.response.to.have.status(200));
pm.test("Correct student returned", () => {
  const s = pm.response.json().data;
  pm.expect(s.id).to.equal(1);
  pm.expect(s).to.have.all.keys('id','student_number','first_name','last_name','course','year_level','created_at');
});
```

**Expected Response (200 OK):**
```json
{ "success": true, "data": { "id": 1, "student_number": "2023300001", ... } }
```

**Test 2b – 404 Not Found:**

| Field | Value |
|---|---|
| **URL** | `http://localhost:3000/api/students/9999` |

**Expected Response (404):**
```json
{ "success": false, "message": "Student not found." }
```

---

## Test 3 – POST Create Student

| Field | Value |
|---|---|
| **Method** | POST |
| **URL** | `http://localhost:3000/api/students` |
| **Headers** | `Content-Type: application/json` |

**Body (raw JSON):**
```json
{
  "student_number": "2025000099",
  "first_name": "Postman",
  "last_name": "Tester",
  "course": "BSIT",
  "year_level": 1
}
```

**Test Script:**
```javascript
pm.test("Status code is 201", () => pm.response.to.have.status(201));
pm.test("Student was created", () => {
  const json = pm.response.json();
  pm.expect(json.success).to.be.true;
  pm.expect(json.data.student_number).to.equal("2025000099");
  pm.environment.set("created_id", json.data.id);
});
```

**Expected Response (201 Created):**
```json
{ "success": true, "message": "Student created successfully.", "data": { "id": 11, ... } }
```

**Test 3b – Validation Error (missing field):**

**Body:**
```json
{ "student_number": "2025000100" }
```

**Expected Response (400):**
```json
{ "success": false, "message": "All fields are required: student_number, first_name, last_name, course, year_level." }
```

---

## Test 4 – PUT Update Student

| Field | Value |
|---|---|
| **Method** | PUT |
| **URL** | `http://localhost:3000/api/students/{{created_id}}` |
| **Headers** | `Content-Type: application/json` |

**Body (raw JSON):**
```json
{
  "student_number": "2025000099",
  "first_name": "Postman",
  "last_name": "Updated",
  "course": "BSCS",
  "year_level": 2
}
```

**Test Script:**
```javascript
pm.test("Status code is 200", () => pm.response.to.have.status(200));
pm.test("Student was updated", () => {
  const json = pm.response.json();
  pm.expect(json.data.last_name).to.equal("Updated");
  pm.expect(json.data.course).to.equal("BSCS");
});
```

**Expected Response (200 OK):**
```json
{ "success": true, "message": "Student updated successfully.", "data": { "last_name": "Updated", "course": "BSCS", ... } }
```

---

## Test 5 – DELETE Student

| Field | Value |
|---|---|
| **Method** | DELETE |
| **URL** | `http://localhost:3000/api/students/{{created_id}}` |
| **Headers** | None required |
| **Body** | None |

**Test Script:**
```javascript
pm.test("Status code is 200", () => pm.response.to.have.status(200));
pm.test("Deletion confirmed", () => {
  pm.expect(pm.response.json().success).to.be.true;
});
```

**Expected Response (200 OK):**
```json
{ "success": true, "message": "Student deleted successfully." }
```

---

## Test 6 – GET Search by Keyword

| Field | Value |
|---|---|
| **Method** | GET |
| **URL** | `http://localhost:3000/api/students/search/santos` |
| **Headers** | None required |
| **Body** | None |

**Test Script:**
```javascript
pm.test("Status code is 200", () => pm.response.to.have.status(200));
pm.test("Results contain keyword", () => {
  pm.response.json().data.forEach(s => {
    const combined = (s.first_name + s.last_name + s.student_number + s.course).toLowerCase();
    pm.expect(combined).to.include("santos");
  });
});
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": [
    { "id": 1, "last_name": "Santos", "first_name": "Maria", "course": "BSIT", ... }
  ]
}
```

---

## Postman Environment Variables

| Variable | Initial Value |
|---|---|
| `base_url` | `http://localhost:3000` |
| `created_id` | *(set dynamically in Test 3)* |

> **Import tip:** Import `postman_collection.json` into Postman directly. Run the collection in order (Tests 1 → 6) to execute the full integration test suite.
