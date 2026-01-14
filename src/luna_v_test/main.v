module main

// Simpler state handling avoiding structs for now to minimize runtime issues
// in this specific V version's WASM backend
__global (
    g_count int
)

// Manual implementation of strlen for WASM environment
fn my_strlen(s &u8) int {
    mut i := 0
    unsafe {
        for s[i] != 0 {
            i++
        }
    }
    return i
}

// Exported function to get the HTML content
@[export: 'get_html']
pub fn get_html() &u8 {
    unsafe {
        if g_count == 0 {
             return c'<div class="v-component">Count: 0</div>'
        } else {
             return c'<div class="v-component">Count: 1+</div>'
        }
    }
}

// Exported function to get string length (helper for JS)
@[export: 'get_html_len']
pub fn get_html_len() int {
    unsafe {
        if g_count == 0 {
             s := c'<div class="v-component">Count: 0</div>'
             return my_strlen(s)
        } else {
             s := c'<div class="v-component">Count: 1+</div>'
             return my_strlen(s)
        }
    }
}

// Exported function to increment state
@[export: 'increment']
pub fn increment() {
    g_count++
}

// Exported function to get current count
@[export: 'get_count']
pub fn get_count() int {
    return g_count
}

pub fn main() {
    println('V WASM module initialized')
}
