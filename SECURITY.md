# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously at NextGenXplorrers Team. If you discover a security vulnerability in Axiom Bot, please follow these steps:

### How to Report

1. **DO NOT** create a public GitHub issue for security vulnerabilities
2. Send a detailed report to: **nxgextra@gmail.com**
3. Include the following information:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes (optional)

### What to Expect

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Resolution Timeline**: Depends on severity

### Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| Critical | Remote code execution, data breach | 24 hours |
| High | Authentication bypass, privilege escalation | 48 hours |
| Medium | Information disclosure, DoS | 7 days |
| Low | Minor issues, best practice violations | 14 days |

## Security Best Practices

When self-hosting Axiom Bot:

### Environment Variables

```bash
# NEVER commit these to version control
DISCORD_TOKEN=your_token_here
GROQ_API_KEY=your_key_here
OCR_API_KEY=your_key_here
```

### Recommendations

1. **Keep tokens private** - Never share or expose API tokens
2. **Use environment variables** - Store secrets in `.env` files
3. **Regular updates** - Keep dependencies updated
4. **Access control** - Limit bot permissions to necessary channels
5. **Monitor logs** - Watch for unusual activity

### What We Protect

- Discord bot tokens
- API keys and secrets
- User data and messages
- Server configurations

## Acknowledgments

We appreciate security researchers who help keep Axiom Bot safe. Responsible disclosure helps protect our users.

---

**Contact**: nxgextra@gmail.com
**Team**: NextGenXplorrers Team
