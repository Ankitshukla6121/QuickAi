import React, { useEffect, useState } from 'react'

import { Sparkles, ShieldCheck } from 'lucide-react'
import CreationItem from '../components/CreationItem'
import { Protect, useAuth } from '@clerk/clerk-react';


import Markdown from 'react-markdown'

import axios from 'axios'

import toast from 'react-hot-toast';

axios.defaults.baseURL= import.meta.env.VITE_BASE_URL;
const Dashboard = () => {
  const [creations, setCreations] = useState([]);
  const [loading,setLoading]= useState(true);
  
  const {getToken}= useAuth()

  const getDashboardData = async () => {

    try {

      const {data}= await axios.get("/api/user/get-user-creations",{
        headers:{Authorization:`Bearer ${await getToken()}`}
      })
      if(data.success){
        setCreations(data.creations) 
      }else{
        toast.error(data.message)
      }
      
    } catch (error) {
      toast.error(error.message)
    }
    setLoading(false)
  }

  useEffect(() => {
    getDashboardData()
  }, [])

  return (
    <div className='h-full overflow-y-scroll p-6'>
      <div className='flex justify-start gap-4 flex-wrap'>
        {/* total creations card */}
        <div className='flex justify-between items-center w-72 p-4 bg-white rounded-xl border border-gray-200'>
          <div className='text-slate-600'>
            <p className='text-sm'>Total Creations</p>
            <h2 className='text-xl font-semibold'>{creations.length}</h2>
          </div>
          <div className='w-10 h-10 rounded-lg bg-gradient-to-br from-[#3588F2] to-[#0BB0D7] text-white flex justify-center items-center'>
            <Sparkles className='w-5 text-white' />
          </div>
        </div>

        {/* Active plan card */}
        <div className='flex justify-between items-center w-72 p-4 bg-white rounded-xl border border-gray-200'>
          <div className='text-slate-600'>
            <p className='text-sm'>Active Plan</p>
            <h2 className='text-xl font-semibold'>
              <Protect plan='premium' fallback='Free'>
                Premium
              </Protect>
            </h2>
          </div>
          <div className='w-10 h-10 rounded-lg bg-gradient-to-br from-[#FF61C5] to-[#9E53EE] text-white flex justify-center items-center'>
            <ShieldCheck className='w-5 text-white' />
          </div>
        </div>
      </div>
         
         {
          loading ? (
             <div className="flex justify-center items-center h-full">
  <span className="w-8 h-8 rounded-full border-4 border-t-transparent border-blue-500 animate-spin"></span>
</div>
          ) :(
        <div className='space-y-3'>
        <p className='mt-6 mb-4'> Recent Creations</p>
        {
          creations.map((item) => <CreationItem key={item.id} item={item} />)
        }
      </div>)
         }

      
    </div>
  )
}

export default Dashboard