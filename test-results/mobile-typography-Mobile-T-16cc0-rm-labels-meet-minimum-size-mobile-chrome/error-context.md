# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - heading "PipeTrak V2" [level=2] [ref=e6]
      - paragraph [ref=e7]: Sign in to your account
    - generic [ref=e8]:
      - generic [ref=e9]:
        - generic [ref=e10]:
          - generic [ref=e11]: Email
          - textbox "Email" [ref=e12]
        - generic [ref=e13]:
          - generic [ref=e14]:
            - generic [ref=e15]: Password
            - link "Forgot password?" [ref=e16] [cursor=pointer]:
              - /url: /forgot-password
          - textbox "Password" [ref=e17]
      - button "Sign in" [ref=e18] [cursor=pointer]
      - paragraph [ref=e20]:
        - text: Don't have an account?
        - link "Create account" [ref=e21] [cursor=pointer]:
          - /url: /register
  - region "Notifications alt+T"
```