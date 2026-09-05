# Python Data Analytics & Algorithms Demo
import sys
import math

print(f"🐍 Python Version: {sys.version.split()[0]}")
print("========================================")

def calculate_primes(limit):
    primes = []
    for num in range(2, limit + 1):
        if all(num % i != 0 for i in range(2, int(math.isqrt(num)) + 1)):
            primes.append(num)
    return primes

limit = 50
primes = calculate_primes(limit)
print(f"Prime numbers up to {limit}:")
print(primes)
print(f"Total count: {len(primes)}")
print("✨ Execution Finished.")
