import requests 
def list_image_tags(user, repository):
    url = f"https://hub.docker.com/v2/repositories/{user}/{repository}/tags"
    response = requests.get(url)
    image_names = []

    if response.status_code == 200:
        tags = response.json()
        for tag in tags['results']:
            image_name = f"{user}/{repository}:{tag['name']}"
            image_names.append(image_name)
    else:
        print("Failed to fetch image tags")

    return image_names


def get_docker_hub_token(username, password):
    url = "https://hub.docker.com/v2/users/login/"
    headers = {"Content-Type": "application/json"}
    response = requests.post(url, json={"username": username, "password": password}, headers=headers)

    if response.status_code == 200:
        token = response.json().get('token')
        return token
    else:
        print("Authentication failed")
        return None

def list_private_repositories(user, token):
    url = f"https://hub.docker.com/v2/repositories/{user}/"
    headers = {"Authorization": f"JWT {token}"}
    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        repos = response.json()['results']
        for repo in repos:
            print(repo['name'])
    else:
        print("Failed to fetch repositories")

# Replace these with your Docker Hub credentials
usr = "gladospipeline"
pwd = "Nervy3-Scoop-Quiver"

token = get_docker_hub_token(usr, pwd)
if token:
    user = "gladospipeline"  # User whose private repositories you want to list
    list_private_repositories(user, token)
    
repository = "glados-backend"  # Example repository; replace with the specific repository you want to list tags for
image_tags = list_image_tags(usr, repository)
print('List of images: ' + ', '.join(image_tags))