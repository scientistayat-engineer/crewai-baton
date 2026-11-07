/* Shows Sign in or Sign out in the navigation */
fetch("/api/auth/me").then(r=>r.ok?r.json():Promise.reject()).then(u=>{const a=$("#auth");a.textContent="Sign out ("+u.name+")";a.href="#";a.onclick=async e=>{e.preventDefault();await fetch("/api/auth/logout",{method:"POST"});location.reload()}}).catch(()=>{});
