# Contributing to Open Agent Skill

Thank you for your interest in contributing to Open Agent Skill! This document provides guidelines and information for contributors.

## How to Contribute

### Reporting Bugs

- Check if the bug has already been reported in Issues
- If not, create a new issue with a clear title and description
- Include steps to reproduce, expected behavior, and actual behavior
- Add screenshots if applicable

### Suggesting Features

- Check existing issues and discussions for similar ideas
- Create a new issue with the `enhancement` label
- Describe the feature and its potential benefits

### Pull Requests

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes with clear commit messages
4. Ensure code follows existing patterns and style
5. Test your changes locally
6. Submit a pull request with a clear description

## Development Setup

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Run type checking
pnpm type-check

# Run linting
pnpm lint
```

## Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — New features
- `fix:` — Bug fixes
- `docs:` — Documentation changes
- `style:` — Code style changes (formatting, etc.)
- `refactor:` — Code refactoring
- `test:` — Adding or updating tests
- `chore:` — Maintenance tasks

## Code Style

- Use TypeScript for all new code
- Follow existing component patterns
- Use Tailwind CSS for styling
- Keep components small and focused

## Questions?

Feel free to open an issue or reach out to the maintainers.
