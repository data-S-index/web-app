# How to backup the database

Run the pg_dump command in the VM's terminal to back up the database.

Use -Fd -j 4 -Z 6 options to create a directory format backup with parallel jobs and compression. The command looks like this:

<!-- pg_dump -h localhost -U admin -p 43997 -Fd -j 4 -Z 6 -f s_index_local_dir s_index_local -->

```bash
cd web-app

# Dump in parallel into container's /tmp
docker exec -t 3e3adc6927ca pg_dump -U admin -Fd -j 4 -Z 6 -f /tmp/backup_dir s_index_local

# Copy to host when done
docker cp 3e3adc6927ca:/tmp/backup_dir ./backup_06_30_2026.dir

# Cleanup container backup directory
docker exec 3e3adc6927ca rm -rf /tmp/backup_dir

# scp backup folder from remote server to local machine
scp -r user@host:/root/web-app/backup_06_30_2026.dir ./
```

<!-- scp -r root@s-index-resources:/root/web-app/backup_06_30_2026.dir ./ -->

This command creates a directory format backup of the s_index_local database, using 4 parallel jobs and compression level 6. The backup directory is written inside the container at /tmp/backup_dir. After the backup is complete, it is copied to the host machine using docker cp, and then can be transferred to a remote server using scp. Finally, the temporary backup directory inside the container is cleaned up.
