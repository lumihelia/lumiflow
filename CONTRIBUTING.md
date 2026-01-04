# Contributing to LumiFlow

Thank you for considering contributing to LumiFlow! 🎉

## Ways to Contribute

### 🐛 Report Bugs

Found a bug? Please [open an issue](https://github.com/lumihelia/lumiflow/issues) with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Screenshots (if applicable)
- Browser version & OS

### 💡 Suggest Features

Have an idea? [Open an issue](https://github.com/lumihelia/lumiflow/issues) with:
- Clear description of the feature
- Use case / problem it solves
- Mockups or examples (if applicable)

### 🔧 Submit Pull Requests

Want to code? Awesome!

**Before starting**:
1. Check existing issues to avoid duplicates
2. For major changes, open an issue first to discuss
3. Fork the repository
4. Create a new branch

**Development Setup**:
```bash
# 1. Clone your fork
git clone https://github.com/YOUR_USERNAME/lumiflow.git
cd lumiflow

# 2. Load in Chrome
# - Open chrome://extensions/
# - Enable "Developer mode"
# - Click "Load unpacked"
# - Select the lumiflow folder

# 3. Make your changes
# - Edit files in your favorite editor
# - Test in Chrome

# 4. Reload extension to see changes
# - Go to chrome://extensions/
# - Click the reload icon on LumiFlow
```

**Code Guidelines**:
- Use clear variable names
- Add comments for complex logic
- Test on all supported platforms (ChatGPT, Claude, Gemini)
- Keep the same code style as existing code

**Commit Messages**:
```
Good:
✅ "Fix: Copy All now captures full conversation content"
✅ "Feature: Add support for Perplexity.ai"
✅ "Docs: Update installation instructions"

Bad:
❌ "fix stuff"
❌ "changes"
❌ "update"
```

**Pull Request Process**:
1. Update README.md if needed
2. Update version number in manifest.json
3. Test thoroughly
4. Submit PR with clear description
5. Wait for review

### 📖 Improve Documentation

Documentation improvements are always welcome!
- Fix typos
- Add examples
- Clarify confusing sections
- Translate to other languages

### 🎨 Design Contributions

Help make LumiFlow beautiful:
- UI/UX improvements
- Icon designs
- Marketing materials
- Screenshots

## Platform Support

Want to add support for a new AI platform?

**Required files to modify**:
1. `content.js` - Add platform detection & extraction
2. `manifest.json` - Add to `host_permissions`
3. `README.md` - Update supported platforms table

**Example PR**: See how Claude support was added (link to commit)

## Compression Prompt Improvements

The compression prompt is in `content.js` (`DEFAULT_COMPRESSION_PROMPT`).

If you have ideas to improve compression quality:
1. Test your prompt thoroughly
2. Document why it's better (examples)
3. Submit PR with before/after comparisons

## Code of Conduct

### Our Standards

- ✅ Be respectful and inclusive
- ✅ Welcome newcomers
- ✅ Accept constructive criticism
- ✅ Focus on what's best for the community

### Not Acceptable

- ❌ Harassment or discriminatory language
- ❌ Trolling or insulting comments
- ❌ Personal attacks
- ❌ Spam or self-promotion

## License

By contributing, you agree that your contributions will be licensed under AGPLv3.

This means:
- Your code will be open source
- Others can use and modify it
- But they must also open source their modifications

## Questions?

- **General questions**: [Open a discussion](https://github.com/lumihelia/lumiflow/discussions)
- **Bug reports**: [Open an issue](https://github.com/lumihelia/lumiflow/issues)
- **Direct contact**: [@LumiHelia](https://x.com/LumiHelia) on Twitter/X

## Recognition

All contributors will be:
- Listed in the project README
- Thanked in release notes
- Given credit in the extension

## Thank You!

Every contribution helps make AI more interoperable and accessible.

We're building infrastructure for the AI era, together. 💜

---

**Happy coding!**  
The LumiFlow Team
