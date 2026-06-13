# How to restore the database

Run the pg_restore command in the VM's terminal to restore the database from a directory format backup.

Use -Fd -j 4 options to restore using directory format with parallel jobs. The command looks like this:

<!-- pg_restore -h localhost -U admin -p 43997 -Fd -j 4 -d s_index_local s_index_local_dir -->

```bash
cd web-app

# scp backup folder from local machine to remote server
scp -r ./backup_06_05_2026.dir user@host:/root/web-app/backup_06_05_2026.dir

# Copy backup directory into container
docker cp ./backup_06_05_2026.dir 3e3adc6927ca:/tmp/backup_dir

# Restore in parallel from container's /tmp
docker exec -t 3e3adc6927ca pg_restore -U admin -Fd -j 4 -d s_index_local /tmp/backup_dir

# Cleanup container backup directory
docker exec 3e3adc6927ca rm -rf /tmp/backup_dir
```

<!-- scp -r ./backup_06_05_2026.dir root@s-index-resources:/root/web-app/backup_06_05_2026.dir -->

This command restores the s_index_local database from a directory format backup, using 4 parallel jobs. The backup directory is first transferred from the local machine to the remote server using scp, then copied into the container using docker cp. The restore is performed inside the container using pg_restore, and the temporary backup directory inside the container is cleaned up afterward.
