import re

with open("src/hooks/useInvisibleWallet.ts", "r") as f:
    code = f.read()

# 1. Replace imports
code = code.replace("import { useState, useEffect, useCallback } from 'react';", "import { useState, useEffect, useCallback } from 'react';\nimport AsyncStorage from '@react-native-async-storage/async-storage';\nimport { Passkey } from 'react-native-passkeys';")

# 2. Rip out PIN mode cryptography functions and DOM types since we'll rely entirely on Passkeys
code = re.sub(r'async function generateP256Keypair\(\).*?async function extractP256PublicKey\(response: AuthenticatorAttestationResponse\)', 'async function extractP256PublicKey(response: any)', code, flags=re.DOTALL)

# Also remove extractP256Signature because the signature extraction is different for Passkeys
# Wait, I will just do it manually. Let's just fix the localStorage first.

# 3. Replace process.env.NEXT_PUBLIC_* with hardcoded for now, or Expo envs (process.env.EXPO_PUBLIC_ZERODEV_PROJECT_ID)
code = code.replace("process.env.NEXT_PUBLIC_", "process.env.EXPO_PUBLIC_")

# 4. We need to do a full find-and-replace of localStorage
code = code.replace("localStorage.setItem(", "AsyncStorage.setItem(")
code = code.replace("localStorage.getItem(", "await AsyncStorage.getItem(")
code = code.replace("localStorage.removeItem(", "AsyncStorage.removeItem(")

# For the lazy initializer, we'll just set it to null and load in useEffect
init_replace = """    const [address, setAddress] = useState<string | null>(null);

    useEffect(() => {
        setHasMounted(true);
        AsyncStorage.getItem('invisible_wallet_address').then(stored => {
            if (stored) setAddress(stored);
        });
    }, []);"""
code = re.sub(r'const \[address, setAddress\].*?}, \[\]\);', init_replace, code, flags=re.DOTALL)

with open("src/hooks/useInvisibleWallet.ts", "w") as f:
    f.write(code)
