module main

fn fib(n int) int {
	if n <= 1 {
		return n
	}
	return fib(n - 1) + fib(n - 2)
}

fn main() {
	println('Hello from V!')
	res := fib(10)
	println('Fib(10) = $res')
}
