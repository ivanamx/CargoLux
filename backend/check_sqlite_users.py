import sqlite3

def check_sqlite_users():
    conn = sqlite3.connect('attendance.db')
    cursor = conn.cursor()
    
    try:
        # Ver contenido de la tabla users
        cursor.execute("SELECT id, username, email, role, hashed_password FROM users")
        users = cursor.fetchall()
        
        print("\nContenido de la tabla users:")
        for user in users:
            print(f"\nID: {user[0]}")
            print(f"Username: {user[1]}")
            print(f"Email: {user[2]}")
            print(f"Role: {user[3]}")
            print(f"Password Hash: {user[4]}")
            print("-" * 50)
            
        # Ver también contenido de la tabla admins
        print("\nContenido de la tabla admins:")
        cursor.execute("SELECT id, email, full_name, hashed_password FROM admins")
        admins = cursor.fetchall()
        for admin in admins:
            print(f"\nID: {admin[0]}")
            print(f"Email: {admin[1]}")
            print(f"Full Name: {admin[2]}")
            print(f"Password Hash: {admin[3]}")
            print("-" * 50)
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_sqlite_users() 