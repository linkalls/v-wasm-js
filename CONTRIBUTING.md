# Contributing to Vitrio

Thank you for your interest in contributing to Vitrio! We welcome contributions from the community.

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.0+ (recommended) or Node.js v18+
- Git

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Vitrio.git
   cd Vitrio
   ```
3. Install dependencies:
   ```bash
   bun install
   ```
4. Build the project:
   ```bash
   bun run build
   ```

## 📝 Development Workflow

### Running the Examples

```bash
# Run the counter example
bun run dev
```

### Building

```bash
# Build the library
bun run build

# Build WASM module
bun run build:wasm

# Build TypeScript types
bun run build:types
```

### Running Benchmarks

```bash
# With Bun (recommended)
bun benchmarks/run.ts

# With Node.js
node benchmarks/run-node.mjs
```

## 🧪 Testing

While we're working on comprehensive test coverage, please ensure:

1. Your code works with the example applications
2. You've tested edge cases manually
3. Performance benchmarks don't regress

## 📋 Pull Request Process

1. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**:
   - Keep changes focused and atomic
   - Follow the existing code style
   - Add comments for complex logic
   - Update documentation if needed

3. **Commit your changes**:
   - Use clear, descriptive commit messages
   - Follow conventional commits format: `type(scope): description`
   - Examples:
     - `feat(core): add error boundary support`
     - `fix(render): resolve memory leak in cleanup`
     - `docs(readme): update installation instructions`

4. **Push and create a PR**:
   ```bash
   git push origin feature/your-feature-name
   ```
   - Fill out the PR template
   - Link related issues
   - Request reviews from maintainers

5. **Address review feedback**:
   - Be responsive to comments
   - Make requested changes
   - Keep the discussion constructive

## 🎨 Code Style

- Use TypeScript for all new code
- Follow the existing code formatting
- Use meaningful variable and function names
- Keep functions small and focused
- Prefer immutability where possible
- Add JSDoc comments for public APIs

## 📚 Documentation

When adding features or making changes:

- Update README.md if the change affects usage
- Update relevant documentation in `/docs`
- Add code examples where helpful
- Keep Japanese translations in sync (`README.ja.md`)

## 🐛 Bug Reports

When filing a bug report, please include:

- Vitrio version
- Bun/Node.js version
- Operating system
- Steps to reproduce
- Expected behavior
- Actual behavior
- Minimal reproduction code

## 💡 Feature Requests

We love feature ideas! Please:

- Search existing issues first
- Describe the use case clearly
- Explain how it benefits Vitrio users
- Consider providing a pull request

## 🔒 Security Issues

**DO NOT** open public issues for security vulnerabilities.

Instead, please email security concerns to the maintainers or use GitHub's private vulnerability reporting.

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🙏 Questions?

- Open a [Discussion](https://github.com/linkalls/Vitrio/discussions)
- Check existing [Issues](https://github.com/linkalls/Vitrio/issues)
- Read the [Documentation](./docs/)

Thank you for contributing to Vitrio! 🎉
