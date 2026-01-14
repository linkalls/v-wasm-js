module main

// Simple approach: just use parameters to pass state
// The TS layer will manage the actual state

// For WASM, we'll use a simple approach:
// - Caller manages signal IDs
// - WASM just does the math

@[export: 'add']
pub fn add(a int, b int) int {
	return a + b
}

@[export: 'sub']
pub fn sub(a int, b int) int {
	return a - b
}

@[export: 'fib']
pub fn fib(n int) int {
	if n <= 1 {
		return n
	}
	return fib(n - 1) + fib(n - 2)
}

fn main() {}
