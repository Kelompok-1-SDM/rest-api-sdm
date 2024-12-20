import { UserDataType } from "../models/usersModels";
import { hashPassword } from "../utils/utils";
import * as usersModels from "../models/usersModels";
import * as kegiatanModels from "../models/kegiatanModels"
import { calculateFileHash, exportExcel, parseExcel, uploadFileToCdn } from "./utilsService";

export async function homepageMobile(uidUser: string) {
    const temp = await usersModels.fetchUserByUid(uidUser)
    if (!temp || Object.keys(temp).length === 0) return "user_is_not_found"

    const jumlahBulanSkrg = await kegiatanModels.fetchJumlahKegiatanAkanDilaksanakanByUser(uidUser, new Date().getMonth() + 1)
    const duaTugasTerbaru = await kegiatanModels.fetchKegiatanByUser(uidUser, false, undefined, true)
    const tugasBerlangsung = await kegiatanModels.fetchUserCurrentKegiatan(uidUser, new Date())
    const stats = await statistic(uidUser)

    return {
        jumlahTugasBulanSekarang: jumlahBulanSkrg,
        duaTugasTerbaru: duaTugasTerbaru,
        tugasBerlangsung: tugasBerlangsung ? tugasBerlangsung : null,
        statistik: stats
    }
}

export async function homepageWeb() {
    // Jumlah-jumlah
    const jumlahDosen = await usersModels.fetchUserCount('dosen')
    const jumlahManajemen = await usersModels.fetchUserCount('manajemen')
    const jumlahKegiatan = await kegiatanModels.fetchKegiatanCountAll()
    const jumlahKegiatanPerTahun = await kegiatanModels.fetchKegiatanCountEachYear()

    // Peforma kegiatan
    const peformaKegiatan = await kegiatanModels.fetchPeformaKegiatan(new Date().getFullYear())

    return {
        jumlahDosen,
        jumlahManajemen,
        jumlahKegiatan,
        jumlahKegiatanPerTahun,
        peformaKegiatan
    }
}

export async function statistic(uidUser: string, year: number = new Date().getFullYear()) {
    const temp = await usersModels.fetchUserByUid(uidUser)
    if (!temp || Object.keys(temp).length === 0) return "user_is_not_found"

    return await usersModels.fetchUserStatistic(uidUser, year)
}

export async function fetchAllUsers() {
    return await usersModels.fetchAllUser()
}

export async function exportExcelService(role: 'admin' | 'manajemen' | 'dosen') {
    const data = await fetchUserByRole(role)

    return exportExcel(data.map((it) => {
        return {
            nip: it.nip,
            nama: it.nama,
            email: it.email
        }
    }))
}

export async function fetchUserByRole(role: 'admin' | 'manajemen' | 'dosen') {
    return await usersModels.fetchUserByRole(role)
}

export async function fetchUser(uid?: string, nip?: string) {
    const res = await usersModels.fetchUserComplete(uid, nip)
    if (!res || Object.keys(res).length === 0) return "user_is_not_found"

    return res
}

export async function importUser(file: Express.Multer.File, role: 'admin' | 'manajemen' | 'dosen') {
    const parsedExcel = await parseExcel(file, role)
    const apalah: UserDataType[] = await Promise.all(parsedExcel.map(async (it) => {
        const ap = await hashPassword(String(it.nip))
        return {
            ...it,
            password: ap,
            role
        }
    }))
    await usersModels.createBatchUser(apalah)
}

export async function createUser(data: UserDataType, file?: Express.Multer.File) {
    data.password = await hashPassword(data.password)

    if (file) {
        const hashFile = calculateFileHash(file.buffer)
        const fileUrl = await uploadFileToCdn(file, hashFile, 'profil')
        data.profileImage = fileUrl
    }

    return await usersModels.createUser(data)
}

export async function updateUser(uidUser: string, data: Partial<usersModels.UserDataType>, file?: Express.Multer.File) {
    const temp = await usersModels.fetchUserByUid(uidUser)
    if (!temp || Object.keys(temp).length === 0) return "user_is_not_found"

    if (data.password) data.password = await hashPassword(data.password)

    if (file) {
        const hashFile = calculateFileHash(file.buffer)
        const fileUrl = await uploadFileToCdn(file, hashFile, 'profil')
        data.profileImage = fileUrl
    }

    return await usersModels.updateUser(uidUser, data)
}

export async function deleteUser(uidUser: string) {
    const res = await usersModels.deleteUser(uidUser)
    if (!res || Object.keys(res).length === 0) return "user_is_not_found"

    return res
}