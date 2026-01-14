module main

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
	if n <= 1 { return n }
	mut a := 0
	mut b := 1
	mut i := 2
	for i <= n {
		c := a + b
		a = b
		b = c
		i = i + 1
	}
	return b
}
