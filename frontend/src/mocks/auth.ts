export interface AuthUser {
  id: string
  email: string
  name: string
  avatarInitials: string
}

const DEMO_USERS: Record<string, { password: string; name: string }> = {
  'demo@lifemap.in': { password: 'demo1234', name: 'Priya Sharma' },
  'rajesh@lifemap.in': { password: 'demo1234', name: 'Rajesh Kumar' },
  'anita@lifemap.in': { password: 'demo1234', name: 'Anita Nair' },
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase()
}

export async function mockSignIn(email: string, password: string): Promise<AuthUser> {
  await new Promise(r => setTimeout(r, 800))
  const user = DEMO_USERS[email.toLowerCase()]
  if (!user || user.password !== password) throw new Error('Invalid email or password.')
  return { id: email, email, name: user.name, avatarInitials: initials(user.name) }
}

export async function mockSignUp(email: string, _password: string, name: string): Promise<AuthUser> {
  await new Promise(r => setTimeout(r, 1000))
  return { id: email, email, name, avatarInitials: initials(name) }
}
