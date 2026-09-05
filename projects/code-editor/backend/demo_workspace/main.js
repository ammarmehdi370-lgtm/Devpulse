// Welcome to DevPulse Code Editor!
// Run this file by clicking the "Run Code" button in the header bar.

function fibonacci(n) {
  const sequence = [0, 1];
  for (let i = 2; i < n; i++) {
    sequence.push(sequence[i - 1] + sequence[i - 2]);
  }
  return sequence;
}

console.log("⚡ DevPulse Execution Engine Started...");
console.log("Generating Fibonacci series (10 elements):");
console.log(fibonacci(10).join(", "));

const items = [42, 13, 89, 7, 64, 25];
console.log("\nOriginal Array:", items);
const sorted = items.slice().sort((a, b) => a - b);
console.log("Sorted Array:  ", sorted);
console.log("Done! ✅");
