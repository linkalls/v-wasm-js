struct Node {
mut:
	dependents [64]int
	dep_count int
}

struct Graph {
mut:
	nodes [4096]Node
	node_count int
	update_buffer [4096]int
	update_count int
}

@[export: 'init_graph']
pub fn init_graph() voidptr {
	// Allocate on heap, but maybe we can just use a static instance for single-threaded WASM?
	// For now, heap is fine.
	mut g := &Graph{}
	return g
}

@[export: 'create_node']
pub fn create_node(g_ptr voidptr) int {
	mut g := unsafe { &Graph(g_ptr) }
	id := g.node_count
	g.node_count++
	return id
}

@[export: 'add_dependency']
pub fn add_dependency(g_ptr voidptr, dependent int, dependency int) {
	mut g := unsafe { &Graph(g_ptr) }

	cnt := g.nodes[dependency].dep_count
	// Only check last inserted for quick optimization
	if cnt > 0 && g.nodes[dependency].dependents[cnt-1] == dependent {
		return
	}

	g.nodes[dependency].dependents[cnt] = dependent
	g.nodes[dependency].dep_count++
}

@[export: 'propagate']
pub fn propagate(g_ptr voidptr, source_id int) int {
	mut g := unsafe { &Graph(g_ptr) }
	g.update_count = 0

	// Assuming max 4096 nodes
	mut visited_words := [128]int{}
	mut queue := [4096]int{}
	mut q_head := 0
	mut q_tail := 0

	// Source dependents
	cnt := g.nodes[source_id].dep_count
	for i in 0 .. cnt {
		dep := g.nodes[source_id].dependents[i]
		queue[q_tail] = dep
		q_tail++
		visited_words[dep >> 5] |= (1 << (dep & 31))
	}

	for q_head < q_tail {
		curr := queue[q_head]
		q_head++

		g.update_buffer[g.update_count] = curr
		g.update_count++

		d_cnt := g.nodes[curr].dep_count
		for i in 0 .. d_cnt {
			dep := g.nodes[curr].dependents[i]
			word_idx := dep >> 5
			mask := 1 << (dep & 31)

			if (visited_words[word_idx] & mask) == 0 {
				visited_words[word_idx] |= mask
				queue[q_tail] = dep
				q_tail++
			}
		}
	}

	return g.update_count
}

@[export: 'get_update_buffer_ptr']
pub fn get_update_buffer_ptr(g_ptr voidptr) voidptr {
	g := unsafe { &Graph(g_ptr) }
	return &g.update_buffer[0]
}

fn main() {
}
