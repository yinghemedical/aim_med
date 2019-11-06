import shutil
import os
import json
import zipfile
import re

from aim.engine.configs import *
from aim.engine.utils import is_path_creatable, ls_dir


class AimRepo:
    @staticmethod
    def get_working_repo():
        """
        Searches for .aim repository in working directory
        and returns AimRepo object if exists
        """
        # Get working directory path
        working_dir = os.environ['PWD']

        # Try to find closest .aim repository
        repo_found = False
        while True:
            if len(working_dir) <= 1:
                break

            if os.path.exists(os.path.join(working_dir, AIM_REPO_NAME)):
                repo_found = True
                break
            else:
                working_dir = os.path.split(working_dir)[0]

        if not repo_found:
            return None

        return AimRepo(working_dir)

    @staticmethod
    def cat_to_dir(cat):
        """
        Finds file directory by it's  category
        """
        if cat[0] == 'metrics':
            return AIM_METRICS_DIR_NAME
        elif cat[0] == 'media':
            if cat[1] == 'images':
                return os.path.join(AIM_MEDIA_DIR_NAME, AIM_IMAGES_DIR_NAME)
        elif cat[0] == 'misclassification':
            return AIM_ANNOT_DIR_NAME
        elif cat[0] == 'models':
            return AIM_MODELS_DIR_NAME
        elif cat[0] == 'correlation':
            return AIM_CORR_DIR_NAME

    @staticmethod
    def archive_dir(zip_path, dir_path):
        zip_file = zipfile.ZipFile(zip_path, 'w')
        with zip_file:
            # Writing each file one by one
            for file in ls_dir([dir_path]):
                zip_file.write(file, file[len(dir_path):])

        # Remove model directory
        shutil.rmtree(dir_path)

    def __init__(self, path):
        self._config = {}
        self.path = os.path.join(path, AIM_REPO_NAME)
        self.config_path = os.path.join(self.path, AIM_CONFIG_FILE_NAME)

        if self.config:
            self.branch = self.config.get('active_branch')
        else:
            self.branch = AIM_DEFAULT_BRANCH_NAME

        self.objects_dir_path = os.path.join(self.path,
                                             self.branch,
                                             AIM_OBJECTS_DIR_NAME)
        self.media_dir_path = os.path.join(self.objects_dir_path,
                                           AIM_MEDIA_DIR_NAME)

    def __str__(self):
        return self.path

    @property
    def config(self):
        """
        Config property getter, loads config file if not already loaded and
        returns json object
        """
        if len(self._config) == 0:
            if os.path.isfile(self.config_path):
                with open(self.config_path, 'r') as f:
                    config = json.load(f)
                self._config = config
        return self._config

    @config.setter
    def config(self, config):
        self._config = config

    def save_config(self):
        """
        Saves object config to config file
        """
        with open(self.config_path, 'w') as f:
            f.write(json.dumps(self._config))

    def get_project_name(self):
        """
        Returns project name from config file
        """
        config = self.config
        return config['project_name']

    def get_remote_url(self, remote_name):
        """
        Returns remote url specified by remote name
        """
        for i in self.config['remotes']:
            if i['name'] == remote_name:
                return i['url']
        return None

    def init(self):
        """
        Initializes empty Aim repository
        """
        # Check whether user has sufficient permissions
        if not is_path_creatable(self.path):
            return False

        # Create `.aim` repo
        os.mkdir(self.path)

        # Create config file
        with open(self.config_path, 'w') as config_file:
            config_file.write(json.dumps({
                'remotes': [],
                'branches': [],
                'active_branch': '',
            }))

        self.create_logs()
        self.create_branch(AIM_DEFAULT_BRANCH_NAME)
        self.checkout_branch(AIM_DEFAULT_BRANCH_NAME)

        return True

    def rm(self):
        """
        Removes Aim repository
        """
        shutil.rmtree(self.path)

    def exists(self):
        """
        Checks whether Aim repository is initialized
        """
        return os.path.exists(self.path)

    def ls_files(self):
        """
        Returns list of repository files
        """
        return ls_dir([self.path])

    def load_meta_file(self):
        """
        Returns meta file and its content
        """
        meta_file_path = os.path.join(self.objects_dir_path, 'meta.json')
        if os.path.isfile(meta_file_path):
            meta_file = open(meta_file_path, 'r+')
            meta_file_content = json.loads(meta_file.read())
        else:
            os.makedirs(os.path.dirname(meta_file_path), exist_ok=True)
            meta_file = open(meta_file_path, 'w+')
            meta_file_content = {}

        return meta_file, meta_file_content

    def update_meta_file(self, item_key, item_content):
        """
        Updates meta file content and closes the file
        """
        meta_file, meta_file_content = self.load_meta_file()

        meta_file_content[item_key] = item_content

        # Update and close the file
        meta_file.seek(0)
        meta_file.truncate()
        meta_file.write(json.dumps(meta_file_content))
        meta_file.close()

    def store_file(self, name, cat, content, mode='a', data={}):
        """
        Appends new data to the specified file or rewrites it
        and updates repo meta file
        """
        cat_path = self.cat_to_dir(cat)
        dir_path = os.path.join(self.objects_dir_path, cat_path)
        data_file_path = os.path.join(dir_path, name)

        # Create directory if not exists
        if not os.path.isdir(dir_path):
            os.makedirs(dir_path, exist_ok=True)

        if not os.path.isfile(data_file_path):
            # Create data file
            data_file_content = []
            data_file = open(data_file_path, 'w+')
        else:
            # Get object content
            data_file = open(data_file_path, 'r+')
            data_file_content = json.loads(data_file.read())

        # Set data file content
        if mode == 'a':
            data_file_content.append(content)
        elif mode == 'w':
            data_file_content = [content]

        # Update and close data file
        data_file.seek(0)
        data_file.truncate()
        data_file.write(json.dumps(data_file_content))
        data_file.close()

        # Update meta file
        self.update_meta_file(name, {
            'name': name,
            'type': cat[-1],
            'data': data,
            'data_path': cat_path,
        })

        return {
            'path': os.path.join(cat_path, name),
            'abs_path': data_file_path,
        }

    def store_image(self, name, cat, save_to_meta=False):
        """
        Returns saved object full path
        and updates repo meta file
        """
        images_dir_path = os.path.join(self.media_dir_path,
                                       AIM_IMAGES_DIR_NAME)

        img_rel_path = os.path.join(AIM_MEDIA_DIR_NAME,
                                    AIM_IMAGES_DIR_NAME)
        img_abs_path = os.path.join(images_dir_path, name)

        # Create image directory if not exists
        dir_path = os.path.dirname(img_abs_path)
        if not os.path.isdir(dir_path):
            os.makedirs(dir_path, exist_ok=True)

        # Update meta file
        if save_to_meta:
            self.update_meta_file(name, {
                'name': name,
                'type': cat[-1],
                'data': {},
                'data_path': img_rel_path,
            })

        return {
            'path': os.path.join(img_rel_path, name),
            'abs_path': img_abs_path,
        }

    def store_model_file(self, checkpoint_name, cat):
        """
        Saves a model file into repo
        """
        root_path = os.path.join(self.objects_dir_path,
                                 self.cat_to_dir(cat))

        dir_name = checkpoint_name
        dir_path = os.path.join(root_path, dir_name)
        model_file_name = 'model'
        model_file_path = os.path.join(dir_path,
                                       model_file_name)

        # Create directory
        os.makedirs(dir_path, exist_ok=True)

        return model_file_path

    def store_model(self, checkpoint_name, name, epoch,
                    meta_info, model_info, cat):
        """
        Saves a model into repo
        """
        root_path = os.path.join(self.objects_dir_path,
                                 self.cat_to_dir(cat))

        dir_name = checkpoint_name
        dir_path = os.path.join(root_path, dir_name)
        model_file_name = 'model'
        model_file_path = os.path.join(dir_path,
                                       model_file_name)
        meta_file_path = os.path.join(dir_path, 'model.json')

        # Create directory
        os.makedirs(dir_path, exist_ok=True)

        # Create meta file
        with open(meta_file_path, 'w+') as meta_file:
            meta_file.write(json.dumps({
                'name': name,
                'epoch': epoch,
                'model': model_info,
            }))

        zip_name = '{}.aim'.format(dir_name)
        zip_path = os.path.join(root_path, zip_name)

        # Update repo meta file
        self.update_meta_file(checkpoint_name, {
            'name': checkpoint_name,
            'type': cat[-1],
            'data': {
                'name': name,
                'epoch': epoch,
                'meta': meta_info,
                'model': model_info,
            },
            'data_path': dir_name,
        })

        return {
            'model_path': model_file_path,
            'dir_path': dir_path,
            'zip_path': zip_path,
        }

    def create_branch(self, branch):
        """
        Creates a new branch - a sub-directory in repo
        """
        dir_path = os.path.join(self.path, branch)

        if not re.match(r'^[A-Za-z0-9_\-]{2,}$', branch):
            raise AttributeError('branch name must be at least 2 characters ' +
                                 'and contain only latin letters, numbers, ' +
                                 'dash and underscore')

        # Save branch in repo config file
        branches = self.config['branches']
        for b in branches:
            if b.get('name') == branch:
                raise AttributeError('branch {} already exists'.format(branch))

        # Create branch directory
        objects_dir_path = os.path.join(dir_path, AIM_OBJECTS_DIR_NAME)
        os.makedirs(objects_dir_path)

        branches.append({
            'name': branch,
        })
        self.save_config()

    def checkout_branch(self, branch):
        """
        Checkouts to specified branch
        """
        branches = self.config.get('branches')
        for b in branches:
            if branch == b.get('name'):
                self.config['active_branch'] = branch
                self.branch = branch
                self.save_config()
                return

        raise AttributeError('branch {} does not exist'.format(branch))

    def remove_branch(self, branch):
        """
        Removes specified branch
        """
        if branch == AIM_DEFAULT_BRANCH_NAME:
            msg = '{} branch can not be deleted'.format(AIM_DEFAULT_BRANCH_NAME)
            raise AttributeError(msg)

        branches = self.config.get('branches')

        branch_exists = False
        for b in branches:
            if b.get('name') == branch:
                branch_exists = True
                break

        if not branch_exists:
            raise AttributeError('branch {} does not exist'.format(branch))

        # Remove branch
        self.config['branches'] = list(filter(lambda i: i.get('name') != branch,
                                              self.config['branches']))
        self.save_config()

        # Remove branch sub-directory
        dir_path = os.path.join(self.path, branch)
        shutil.rmtree(dir_path)

        # Set active branch to default if selected branch was active
        if self.branch == branch:
            self.checkout_branch(AIM_DEFAULT_BRANCH_NAME)

    def list_branches(self):
        """
        Returns list of existing branches
        """
        return filter(lambda b: b != '',
                      map(lambda b: b.get('name') if b else '',
                          self.config.get('branches')))

    def ls_branch_files(self, branch):
        """
        Returns list of files of the specified branch
        """
        branch_path = os.path.join(self.path, branch)
        return ls_dir([branch_path])

    def create_logs(self):
        """
        Creates the logs dir in .aim to store error and activity logs
        for cli and sdk respectively
        """
        logs_path = os.path.join(self.path, AIM_LOGGING_DIR_NAME)
        os.mkdir(logs_path)

    def get_logs_dir(self):
        return os.path.join(self.path, AIM_LOGGING_DIR_NAME)