const bcrypt = require("bcrypt");

// Simple utility to generate bcrypt hashes for testing
// Usage: node hash-password.js "your-password"

const password = process.argv[2];

if (!password) {
  console.error("Usage: node hash-password.js <password>");
  process.exit(1);
}

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error("Error:", err);
    process.exit(1);
  }
  console.log("Password:", password);
  console.log("Hash:", hash);
  console.log("\nAdd this to users.json:");
  console.log(JSON.stringify({ email: "test@example.com", passwordHash: hash }, null, 2));
});
