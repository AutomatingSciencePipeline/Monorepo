import os


def main():
    print("Starting in WSL...")
    # Check if wsl is running in ubuntu
    # Run wsl -l -v to check the running distros
    if "Ubuntu" not in os.popen("wsl -l -v").read().encode("utf-8").decode("utf-16").strip():
        print("WSL is not running in Ubuntu. Exiting...")
        print("Please make sure that WSL is running in Ubuntu and try again.")
        return

    # Check if the current directory is the project root
    if not os.path.exists("Monorepo"):
        print("Please run this script from the project root.")
        return

    # Get the current directory
    wsl_current_dir = "/mnt/c/" + os.getcwd().replace("\\", "/").replace("C:/", "").lower().replace("monorepo", "Monorepo")
    print("Current directory in WSL:", wsl_current_dir)
    
    # Rsync the project to WSL
    os.system(f"wsl rsync -avz --exclude='.venv' --exclude='node_modules' --exclude='dist' --exclude='build' --exclude='coverage' --exclude='*.log' {wsl_current_dir} ~") 
    print("Copied project to WSL.")
    
    # Change directory to the project root in WSL
    print("Opening project in VS Code...")
    os.system("wsl bash -c \"cd ~/Monorepo && code .\"")
    print("Done.")
    
if __name__ == "__main__":
    main()